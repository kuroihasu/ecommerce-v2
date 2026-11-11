import { BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { decrypt, encrypt, signState, verifyState } from './crypto.js';
import { checkRedirect, IntegrationsService } from './integrations.service.js';

const owner: StoreAccess = { id: 's1', slug: 'demo', role: 'OWNER' };
const staff: StoreAccess = { ...owner, role: 'STAFF' };
const REDIRECT = 'https://tienda.cl/admin/redes/conectar/meta';

beforeAll(() => {
  process.env.INTEGRATIONS_KEY = 'k'.repeat(40);
  process.env.META_APP_ID = 'app';
  process.env.META_APP_SECRET = 'secret';
});
afterEach(() => vi.unstubAllGlobals());

const svc = (integration: Record<string, unknown> = {}) => new IntegrationsService({ client: { integration } } as unknown as PrismaService);
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('crypto', () => {
  it('cifra y descifra; el texto cifrado no contiene el token', () => {
    const sealed = encrypt('EAAB-token-secreto');
    expect(sealed).not.toContain('EAAB');
    expect(decrypt(sealed)).toBe('EAAB-token-secreto');
  });

  it('detecta un token cifrado alterado', () => {
    const parts = encrypt('abc').split('.');
    parts[3] = Buffer.from('xyz').toString('base64url');
    expect(() => decrypt(parts.join('.'))).toThrow();
  });

  it('el state firmado no se puede modificar y vence', () => {
    const s = signState({ store: 's1', user: 'u1', provider: 'meta', redirectUri: REDIRECT });
    expect(verifyState(s)?.store).toBe('s1');
    const [payload, mac] = s.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), store: 's2' })).toString('base64url');
    expect(verifyState(`${forged}.${mac}`)).toBeNull();
    expect(verifyState(signState({ store: 's1', user: 'u1', provider: 'meta', redirectUri: REDIRECT }, -1))).toBeNull();
  });
});

describe('checkRedirect', () => {
  it('solo acepta la página del panel que termina la conexión', () => {
    expect(checkRedirect(REDIRECT, 'meta')).toBe(REDIRECT);
    expect(checkRedirect('http://localhost:3000/admin/redes/conectar/google', 'google')).toContain('localhost');
    for (const bad of ['http://tienda.cl/admin/redes/conectar/meta', 'https://tienda.cl/otra', 'https://tienda.cl/admin/redes/conectar/meta?x=1', 'nada']) {
      expect(() => checkRedirect(bad, 'meta')).toThrow(BadRequestException);
    }
  });
});

describe('IntegrationsService', () => {
  it('el personal no puede conectar cuentas', () => {
    expect(() => svc().start(staff, 'u1', 'meta', REDIRECT)).toThrow(ForbiddenException);
  });

  it('avisa si Google no está configurado en el servidor', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(() => svc().start(owner, 'u1', 'google', 'https://tienda.cl/admin/redes/conectar/google')).toThrow(ServiceUnavailableException);
  });

  it('arma el login de Meta con el state firmado', () => {
    const { url } = svc().start(owner, 'u1', 'meta', REDIRECT);
    const u = new URL(url);
    expect(u.hostname).toBe('www.facebook.com');
    expect(u.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(verifyState(u.searchParams.get('state')!)?.user).toBe('u1');
  });

  it('rechaza un state de otra tienda o de otro usuario', async () => {
    const state = signState({ store: 's1', user: 'u1', provider: 'meta', redirectUri: REDIRECT });
    await expect(svc().finish({ ...owner, id: 's2' }, 'u1', 'meta', { code: 'c', state, redirectUri: REDIRECT })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc().finish(owner, 'u2', 'meta', { code: 'c', state, redirectUri: REDIRECT })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('conecta Meta: guarda el token cifrado y las cuentas elegidas', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('fb_exchange_token')) return json({ access_token: 'LONG', expires_in: 5_184_000 });
      if (url.includes('oauth/access_token')) return json({ access_token: 'SHORT' });
      if (url.includes('me/accounts')) return json({ data: [{ id: 'p0', name: 'Otra' }, { id: 'p1', name: 'NORTE', instagram_business_account: { id: 'ig1', username: 'norte.cl' } }] });
      if (url.includes('me/adaccounts')) return json({ data: [{ account_id: '99', name: 'NORTE Ads', currency: 'CLP', account_status: 1 }] });
      return json({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
    const upsert = vi.fn();
    const state = signState({ store: 's1', user: 'u1', provider: 'meta', redirectUri: REDIRECT });
    const r = await svc({ upsert }).finish(owner, 'u1', 'meta', { code: 'c', state, redirectUri: REDIRECT });
    expect(r.accountName).toBe('NORTE · @norte.cl');
    const data = upsert.mock.calls[0][0].create;
    expect(data.storeId).toBe('s1');
    expect(data.accessTokenEnc).not.toContain('LONG');
    expect(decrypt(data.accessTokenEnc)).toBe('LONG');
    expect(data.accounts).toMatchObject({ pageId: 'p1', igUserId: 'ig1', adAccountId: '99' });
    // Las consultas con el token van firmadas con appsecret_proof.
    expect(fetchMock.mock.calls.find(([u]) => String(u).includes('me/accounts'))![0]).toContain('appsecret_proof=');
  });

  it('lee publicaciones e insights de Meta solo de la tienda del usuario', async () => {
    const findUnique = vi.fn().mockResolvedValue({ accessTokenEnc: encrypt('LONG'), accounts: { igUserId: 'ig1', adAccountId: '99', currency: 'CLP' } });
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/ig1/media')) return json({ data: [{ id: 'm1', caption: 'Hola', media_type: 'IMAGE', media_url: 'https://x/1.jpg', permalink: 'https://instagram.com/p/1', timestamp: '2026-11-01T00:00:00Z', like_count: 10, comments_count: 2 }] });
      if (url.includes('/ig1?')) return json({ username: 'norte.cl', followers_count: 1200 });
      if (url.includes('act_99/insights')) return json({ data: [{ campaign_name: 'Verano', spend: '15000', impressions: '9000', clicks: '300', ctr: '3.3', actions: [{ action_type: 'purchase', value: '4' }], action_values: [{ action_type: 'purchase', value: '120000' }] }] });
      return json({}, 404);
    }));
    const r = await svc({ findUnique }).insights(owner, 'meta');
    expect(findUnique.mock.calls[0][0].where).toEqual({ storeId_provider: { storeId: 's1', provider: 'META' } });
    expect(r.instagram?.posts[0]).toMatchObject({ caption: 'Hola', likes: 10 });
    expect(r.ads?.campaigns[0]).toMatchObject({ name: 'Verano', spend: 15000, purchases: 4, revenue: 120000 });
  });

  it('un token vencido pide volver a conectar', async () => {
    const findUnique = vi.fn().mockResolvedValue({ accessTokenEnc: encrypt('OLD'), accounts: { igUserId: 'ig1' } });
    vi.stubGlobal('fetch', vi.fn(() => json({ error: { type: 'OAuthException', message: 'expired' } }, 400)));
    await expect(svc({ findUnique }).insights(owner, 'meta')).rejects.toMatchObject({ needsReconnect: true });
  });
});
