import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { DiscountsService } from './discounts.service.js';
import { DiscountInput, codeSchema } from './discounts.schemas.js';

const owner: StoreAccess = { id: 's1', slug: 'demo', role: 'OWNER' };
const staff: StoreAccess = { ...owner, role: 'STAFF' };

function fake(code: Record<string, unknown> | null, settings: Record<string, unknown> = {}) {
  const store = {
    findUniqueOrThrow: vi.fn().mockResolvedValue({ settings }),
    update: vi.fn().mockResolvedValue({}),
  };
  const discountCode = {
    findFirst: vi.fn().mockResolvedValue(code),
    update: vi.fn(async ({ data }) => ({ ...code, ...data })),
    delete: vi.fn().mockResolvedValue({}),
    create: vi.fn(),
    findMany: vi.fn().mockResolvedValue(code ? [code] : []),
  };
  const svc = new DiscountsService({ client: { store, discountCode } } as unknown as PrismaService);
  return { svc, store, discountCode };
}

describe('schemas', () => {
  it('normaliza el código a mayúsculas y rechaza espacios o tildes', () => {
    expect(codeSchema.parse(' norteclub ')).toBe('NORTECLUB');
    expect(codeSchema.safeParse('CON ESPACIO').success).toBe(false);
    expect(codeSchema.safeParse('AÑO').success).toBe(false);
  });

  it('sin cantidad de usos el código queda ilimitado', () => {
    expect(DiscountInput.parse({ code: 'VERANO', percent: 15 }).maxUses).toBeNull();
    expect(DiscountInput.safeParse({ code: 'VERANO', percent: 95 }).success).toBe(false);
    expect(DiscountInput.safeParse({ code: 'VERANO', percent: 15, maxUses: 0 }).success).toBe(false);
  });
});

describe('DiscountsService', () => {
  it('el personal no puede crear ni borrar códigos', async () => {
    const { svc } = fake(null);
    await expect(svc.create(staff, DiscountInput.parse({ code: 'X10', percent: 10 }))).rejects.toThrow(ForbiddenException);
    await expect(svc.remove(staff, 'd1')).rejects.toThrow(ForbiddenException);
  });

  it('check devuelve el porcentaje de un código disponible', async () => {
    const { svc } = fake({ code: 'VERANO', percent: 15, maxUses: null, usedCount: 40 });
    await expect(svc.check('demo', 'VERANO')).resolves.toEqual({ code: 'VERANO', percent: 15 });
  });

  it('check rechaza un código sin usos restantes o inexistente', async () => {
    await expect(fake({ code: 'X', percent: 10, maxUses: 5, usedCount: 5 }).svc.check('demo', 'X')).rejects.toThrow(NotFoundException);
    await expect(fake(null).svc.check('demo', 'X')).rejects.toThrow(NotFoundException);
  });

  it('al editar el código destacado, la tienda muestra el nuevo porcentaje', async () => {
    const { svc, store } = fake({ id: 'd1', code: 'CLUB', percent: 10, active: true, expiresAt: null }, { discountCode: 'CLUB', name: 'Norte' });
    await svc.update(owner, 'd1', { percent: 20 });
    expect(store.update.mock.calls[0][0].data.settings).toEqual({ name: 'Norte', discountCode: 'CLUB', discountPercent: 20, discountExpiresAt: null });
  });

  it('al pausar el código destacado, la tienda deja de anunciarlo', async () => {
    const { svc, store } = fake({ id: 'd1', code: 'CLUB', percent: 10, active: true }, { discountCode: 'CLUB' });
    const r = await svc.update(owner, 'd1', { active: false });
    expect(r.featured).toBe(false);
    expect(store.update.mock.calls[0][0].data.settings).toMatchObject({ discountCode: '', discountPercent: 0 });
  });

  it('al borrar el código destacado, la tienda deja de anunciarlo', async () => {
    const { svc, store } = fake({ id: 'd1', code: 'CLUB', percent: 10 }, { discountCode: 'CLUB' });
    await svc.remove(owner, 'd1');
    expect(store.update.mock.calls[0][0].data.settings).toMatchObject({ discountCode: '', discountPercent: 0 });
  });
});
