import { createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import type { WheelSettings } from './wheel.schemas.js';

// La firma del resultado sale de AUTH_SECRET. Sin él (desarrollo) se usa una clave al
// azar del proceso: la ruleta funciona, pero el resultado no sobrevive a un reinicio.
const KEY = Buffer.from(hkdfSync('sha256', process.env.AUTH_SECRET || randomBytes(32), 'tienda-wheel', 'spin-token', 32));
const TTL = 30 * 60_000;

type Benefit = { kind: 'PERCENT' | 'FREE_SHIPPING'; percent: number; minSubtotal: number };
type Spin = { s: string; i: number; c: string; exp: number };

export function signSpin(spin: Omit<Spin, 'exp'>, ttl = TTL): string {
  const payload = Buffer.from(JSON.stringify({ ...spin, exp: Date.now() + ttl })).toString('base64url');
  return `${payload}.${createHmac('sha256', KEY).update(payload).digest('base64url')}`;
}

export function verifySpin(token: string): Spin | null {
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  const expected = createHmac('sha256', KEY).update(payload).digest();
  const got = Buffer.from(mac, 'base64url');
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const spin = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Spin;
    return spin.exp > Date.now() ? spin : null;
  } catch {
    return null;
  }
}

// Sorteo ponderado: cada premio sale en proporción a su peso.
export function pick(weights: number[], rand: (max: number) => number = randomInt): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(total);
  for (const [i, w] of weights.entries()) {
    if (r < w) return i;
    r -= w;
  }
  return weights.length - 1;
}

// Ruleta de regalos. El servidor decide el premio y lo firma; el código se entrega
// recién cuando el cliente deja su correo, así los códigos no quedan en la página.
@Injectable()
export class WheelService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private async store(slug: string) {
    const store = await this.db.store.findUnique({ where: { slug }, select: { id: true, settings: true } });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return { id: store.id, wheel: (store.settings as { wheel?: WheelSettings } | null)?.wheel };
  }

  // Códigos que hoy se pueden entregar (activos, vigentes y con usos disponibles).
  private async usable(storeId: string, codes: string[]) {
    if (!codes.length) return new Map<string, Benefit>();
    const rows = await this.db.discountCode.findMany({
      where: { storeId, code: { in: codes }, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { code: true, kind: true, percent: true, minSubtotal: true, maxUses: true, usedCount: true },
    });
    return new Map(
      rows.filter((r) => r.maxUses === null || r.usedCount < r.maxUses).map((r): [string, Benefit] => [r.code, { kind: r.kind, percent: r.percent, minSubtotal: r.minSubtotal }]),
    );
  }

  async spin(slug: string) {
    const { id, wheel } = await this.store(slug);
    if (!wheel?.enabled) throw new NotFoundException('La ruleta no está activa');
    const ok = await this.usable(id, wheel.prizes.map((p) => p.code).filter(Boolean));
    // Un premio cuyo código se pausó, venció o se agotó no puede salir.
    const weights = wheel.prizes.map((p) => (p.code && !ok.has(p.code) ? 0 : p.weight));
    if (!weights.some((w) => w > 0)) throw new NotFoundException('La ruleta no tiene premios disponibles');
    const i = pick(weights);
    const prize = wheel.prizes[i];
    // La compra mínima se muestra junto al premio, antes de pedir el correo.
    const benefit = prize.code ? ok.get(prize.code) : undefined;
    return { index: i, label: prize.label, won: Boolean(prize.code), minSubtotal: benefit?.minSubtotal ?? 0, token: signSpin({ s: id, i, c: prize.code }) };
  }

  async claim(slug: string, email: string, token: string) {
    const { id } = await this.store(slug);
    const spin = verifySpin(token);
    if (!spin || spin.s !== id) throw new BadRequestException('El giro venció. Vuelve a girar la ruleta.');
    // Un correo participa una vez: si ya ganó antes, recibe el mismo premio.
    const before = await this.db.subscriber.findUnique({ where: { storeId_email: { storeId: id, email } } });
    const code = before?.source === 'ruleta' ? (before.prize ?? '') : spin.c;
    if (before) {
      if (before.source !== 'ruleta') await this.db.subscriber.update({ where: { id: before.id }, data: { source: 'ruleta', prize: code || null } });
    } else {
      await this.db.subscriber.create({ data: { storeId: id, email, source: 'ruleta', prize: code || null } });
    }
    const repeated = before?.source === 'ruleta';
    const benefit = code ? (await this.usable(id, [code])).get(code) : undefined;
    return benefit ? { code, ...benefit, repeated } : { code: null, kind: null, percent: null, minSubtotal: 0, repeated };
  }

  async subscribe(slug: string, email: string) {
    const { id } = await this.store(slug);
    await this.db.subscriber.upsert({
      where: { storeId_email: { storeId: id, email } },
      update: {},
      create: { storeId: id, email, source: 'pie' },
    });
    return { ok: true };
  }

  async subscribers(access: StoreAccess) {
    const [total, items] = await Promise.all([
      this.db.subscriber.count({ where: { storeId: access.id } }),
      this.db.subscriber.findMany({
        where: { storeId: access.id },
        orderBy: { createdAt: 'desc' },
        take: 5000,
        select: { email: true, source: true, prize: true, createdAt: true },
      }),
    ]);
    return { total, items };
  }
}
