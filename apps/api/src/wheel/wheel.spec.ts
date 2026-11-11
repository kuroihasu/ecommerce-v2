import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { publicSettings } from '../catalog/catalog.service.js';
import { pick, signSpin, verifySpin, WheelService } from './wheel.service.js';
import { WheelSettings } from './wheel.schemas.js';

const wheel = {
  enabled: true,
  title: 'Gira',
  subtitle: '',
  delaySeconds: 5,
  prizes: [
    { label: '10% OFF', code: 'RULETA10', weight: 50 },
    { label: '20% OFF', code: 'RULETA20', weight: 50 },
    { label: 'Sigue participando', code: '', weight: 0 },
  ],
};

function fake(opts: { codes?: { code: string; kind: string; percent: number; minSubtotal: number; maxUses: number | null; usedCount: number }[]; subscriber?: Record<string, unknown> | null; w?: unknown } = {}) {
  const subscriber = {
    findUnique: vi.fn().mockResolvedValue(opts.subscriber ?? null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  };
  const client = {
    store: { findUnique: vi.fn().mockResolvedValue({ id: 's1', settings: { wheel: opts.w ?? wheel } }) },
    discountCode: { findMany: vi.fn().mockResolvedValue(opts.codes ?? []) },
    subscriber,
  };
  return { svc: new WheelService({ client } as unknown as PrismaService), subscriber };
}

describe('sorteo y firma', () => {
  it('cada premio sale según su peso y uno con peso 0 nunca sale', () => {
    expect(pick([1, 0, 3], () => 0)).toBe(0);
    expect(pick([1, 0, 3], () => 1)).toBe(2);
    expect(pick([1, 0, 3], () => 3)).toBe(2);
  });

  it('el resultado firmado no se puede cambiar ni usar vencido', () => {
    const t = signSpin({ s: 's1', i: 0, c: 'RULETA10' });
    expect(verifySpin(t)?.c).toBe('RULETA10');
    const [payload, mac] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), c: 'RULETA90' })).toString('base64url');
    expect(verifySpin(`${forged}.${mac}`)).toBeNull();
    expect(verifySpin(signSpin({ s: 's1', i: 0, c: 'X' }, -1))).toBeNull();
  });

  it('la configuración pide entre 2 y 8 premios y alguno que pueda salir', () => {
    expect(WheelSettings.safeParse(wheel).success).toBe(true);
    expect(WheelSettings.safeParse({ ...wheel, prizes: wheel.prizes.slice(0, 1) }).success).toBe(false);
    expect(WheelSettings.safeParse({ ...wheel, prizes: wheel.prizes.map((p) => ({ ...p, weight: 0 })) }).success).toBe(false);
  });

  it('la API pública no muestra los códigos de los premios', () => {
    const s = publicSettings({ name: 'x', wheel }) as { wheel: { prizes: object[] } };
    expect(JSON.stringify(s)).not.toContain('RULETA10');
    expect(s.wheel.prizes[0]).toEqual({ label: '10% OFF', won: true });
  });

  it('un código anunciado que ya venció deja de anunciarse', () => {
    expect(publicSettings({ discountCode: 'CLUB', discountPercent: 10, discountExpiresAt: '2020-01-01T00:00:00Z' })).toMatchObject({ discountCode: '', discountPercent: 0 });
    expect(publicSettings({ discountCode: 'CLUB', discountPercent: 10, discountExpiresAt: '2999-01-01T00:00:00Z' })).toMatchObject({ discountCode: 'CLUB' });
  });
});

describe('WheelService', () => {
  it('no gira si la ruleta está apagada', async () => {
    await expect(fake({ w: { ...wheel, enabled: false } }).svc.spin('demo')).rejects.toThrow(NotFoundException);
  });

  it('un premio con el código pausado o agotado no sale', async () => {
    const { svc } = fake({ codes: [{ code: 'RULETA20', kind: 'PERCENT', percent: 20, minSubtotal: 0, maxUses: null, usedCount: 0 }, { code: 'RULETA10', kind: 'PERCENT', percent: 10, minSubtotal: 0, maxUses: 5, usedCount: 5 }] });
    for (let n = 0; n < 20; n++) expect((await svc.spin('demo')).label).toBe('20% OFF');
  });

  it('al dejar el correo entrega el código del giro y guarda al suscriptor', async () => {
    const { svc, subscriber } = fake({ codes: [{ code: 'RULETA20', kind: 'PERCENT', percent: 20, minSubtotal: 0, maxUses: null, usedCount: 0 }] });
    const r = await svc.claim('demo', 'ana@correo.cl', signSpin({ s: 's1', i: 1, c: 'RULETA20' }));
    expect(r).toEqual({ code: 'RULETA20', kind: 'PERCENT', percent: 20, minSubtotal: 0, repeated: false });
    expect(subscriber.create.mock.calls[0][0].data).toMatchObject({ email: 'ana@correo.cl', source: 'ruleta', prize: 'RULETA20' });
  });

  it('un correo que ya participó recibe su premio anterior, no uno nuevo', async () => {
    const { svc, subscriber } = fake({
      subscriber: { id: 'x', source: 'ruleta', prize: 'RULETA10' },
      codes: [{ code: 'RULETA10', kind: 'PERCENT', percent: 10, minSubtotal: 0, maxUses: null, usedCount: 0 }],
    });
    const r = await svc.claim('demo', 'ana@correo.cl', signSpin({ s: 's1', i: 1, c: 'RULETA20' }));
    expect(r).toEqual({ code: 'RULETA10', kind: 'PERCENT', percent: 10, minSubtotal: 0, repeated: true });
    expect(subscriber.create).not.toHaveBeenCalled();
  });

  it('un premio de envío gratis entrega el código con su compra mínima', async () => {
    const { svc } = fake({ codes: [{ code: 'ENVIO', kind: 'FREE_SHIPPING', percent: 0, minSubtotal: 30000, maxUses: null, usedCount: 0 }] });
    const r = await svc.claim('demo', 'b@correo.cl', signSpin({ s: 's1', i: 0, c: 'ENVIO' }));
    expect(r).toMatchObject({ code: 'ENVIO', kind: 'FREE_SHIPPING', minSubtotal: 30000 });
  });

  it('rechaza un giro de otra tienda', async () => {
    await expect(fake().svc.claim('demo', 'a@b.cl', signSpin({ s: 'otra', i: 0, c: 'RULETA10' }))).rejects.toThrow(BadRequestException);
  });
});
