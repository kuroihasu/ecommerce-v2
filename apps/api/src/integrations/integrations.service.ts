import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { IntegrationProvider, Prisma } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { decrypt, encrypt, signState, verifyState } from './crypto.js';
import { googleAuthUrl, googleConfigured, googleConnect, googleInsights, type GoogleAccounts } from './google.js';
import { metaAuthUrl, metaConfigured, metaConnect, metaInsights, type MetaAccounts } from './meta.js';

export const PROVIDERS = { meta: 'META', google: 'GOOGLE' } as const satisfies Record<string, IntegrationProvider>;
export type ProviderSlug = keyof typeof PROVIDERS;

const providers = {
  meta: { name: 'Meta', configured: metaConfigured, authUrl: metaAuthUrl },
  google: { name: 'Google Ads', configured: googleConfigured, authUrl: googleAuthUrl },
};

// La dirección de regreso tiene que ser la página del panel que termina la conexión,
// en https (o localhost en desarrollo). Meta y Google además solo aceptan las
// direcciones registradas en sus apps.
export function checkRedirect(uri: string, slug: ProviderSlug) {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    throw new BadRequestException('Dirección de regreso inválida');
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if ((u.protocol !== 'https:' && !(local && u.protocol === 'http:')) || u.pathname !== `/admin/redes/conectar/${slug}` || u.search || u.hash) {
    throw new BadRequestException('Dirección de regreso inválida');
  }
  return u.toString();
}

// Cuentas de Meta y Google conectadas a la tienda: login, guardado de tokens
// cifrados y lectura de publicaciones y resultados de anuncios.
@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private assertManager(access: StoreAccess) {
    if (access.role === 'STAFF') throw new ForbiddenException('Solo dueños y administradores conectan cuentas externas');
  }

  async list(access: StoreAccess) {
    const rows = await this.db.integration.findMany({
      where: { storeId: access.id },
      select: { provider: true, accountName: true, expiresAt: true, refreshTokenEnc: true, updatedAt: true },
    });
    return (Object.keys(providers) as ProviderSlug[]).map((slug) => {
      const row = rows.find((r) => r.provider === PROVIDERS[slug]);
      // Google se renueva solo con el token permanente; Meta vence a los ~60 días.
      const expired = !!row && !row.refreshTokenEnc && !!row.expiresAt && row.expiresAt < new Date();
      return {
        provider: slug,
        name: providers[slug].name,
        available: providers[slug].configured(),
        connected: !!row,
        expired,
        accountName: row?.accountName ?? null,
        connectedAt: row?.updatedAt ?? null,
      };
    });
  }

  start(access: StoreAccess, userId: string, slug: ProviderSlug, redirectUri: string) {
    this.assertManager(access);
    const p = providers[slug];
    if (!p.configured()) throw new ServiceUnavailableException(`La conexión con ${p.name} todavía no está configurada en el servidor.`);
    const uri = checkRedirect(redirectUri, slug);
    return { url: p.authUrl(uri, signState({ store: access.id, user: userId, provider: slug, redirectUri: uri })) };
  }

  async finish(access: StoreAccess, userId: string, slug: ProviderSlug, input: { code: string; state: string; redirectUri: string }) {
    this.assertManager(access);
    const s = verifyState(input.state);
    if (!s || s.store !== access.id || s.user !== userId || s.provider !== slug || s.redirectUri !== input.redirectUri) {
      throw new BadRequestException('La conexión expiró o no corresponde a esta sesión. Vuelve a intentarlo desde el panel.');
    }
    const r = slug === 'meta' ? await metaConnect(input.code, s.redirectUri) : await googleConnect(input.code, s.redirectUri);
    const data = {
      accountName: r.accountName,
      accounts: r.accounts as Prisma.InputJsonObject,
      accessTokenEnc: encrypt(r.accessToken),
      refreshTokenEnc: 'refreshToken' in r && r.refreshToken ? encrypt(r.refreshToken) : null,
      expiresAt: r.expiresAt,
    };
    await this.db.integration.upsert({
      where: { storeId_provider: { storeId: access.id, provider: PROVIDERS[slug] } },
      create: { storeId: access.id, provider: PROVIDERS[slug], ...data },
      update: data,
    });
    return { provider: slug, accountName: r.accountName };
  }

  async disconnect(access: StoreAccess, slug: ProviderSlug) {
    this.assertManager(access);
    await this.db.integration.deleteMany({ where: { storeId: access.id, provider: PROVIDERS[slug] } });
    return { ok: true };
  }

  async insights(access: StoreAccess, slug: ProviderSlug) {
    const row = await this.db.integration.findUnique({ where: { storeId_provider: { storeId: access.id, provider: PROVIDERS[slug] } } });
    if (!row) throw new NotFoundException(`${providers[slug].name} no está conectado`);
    if (slug === 'meta') return metaInsights(decrypt(row.accessTokenEnc), row.accounts as MetaAccounts);
    if (!row.refreshTokenEnc) throw new NotFoundException('Vuelve a conectar Google Ads');
    return googleInsights(decrypt(row.refreshTokenEnc), row.accounts as GoogleAccounts);
  }
}
