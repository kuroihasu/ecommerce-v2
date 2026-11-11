import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { InventoryService, lowStockThreshold } from './inventory.service.js';
import { AdjustInput } from './inventory.schemas.js';

const owner: StoreAccess = { id: 's1', slug: 'demo', role: 'OWNER' };

function fake(variant: Record<string, unknown> | null, updatedCount = 1) {
  const productVariant = { findFirst: vi.fn().mockResolvedValue(variant), updateMany: vi.fn().mockResolvedValue({ count: updatedCount }) };
  const stockMovement = { create: vi.fn(async ({ data }) => ({ id: 'm1', ...data })) };
  const client = { productVariant, stockMovement, $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ productVariant, stockMovement })) };
  return { svc: new InventoryService({ client } as unknown as PrismaService), productVariant, stockMovement };
}
const polera = { id: 'v1', name: 'M / Negro', sku: 'POL-M', stock: 5, product: { name: 'Polera' } };

describe('AdjustInput', () => {
  it('pide sumar/restar o el stock contado, no ambos', () => {
    expect(AdjustInput.safeParse({ variantId: 'v1', reason: 'RESTOCK' }).success).toBe(false);
    expect(AdjustInput.safeParse({ variantId: 'v1', reason: 'RESTOCK', delta: 2, stock: 4 }).success).toBe(false);
    expect(AdjustInput.safeParse({ variantId: 'v1', reason: 'RESTOCK', delta: 0 }).success).toBe(false);
    expect(AdjustInput.safeParse({ variantId: 'v1', reason: 'ADJUSTMENT', stock: 0 }).success).toBe(true);
  });
});

describe('InventoryService', () => {
  it('suma la mercadería que llegó y lo anota en el historial', async () => {
    const { svc, productVariant, stockMovement } = fake(polera);
    const r = await svc.adjust(owner, { variantId: 'v1', delta: 10, reason: 'RESTOCK', note: 'Pedido proveedor' });
    expect(r.stock).toBe(15);
    expect(productVariant.findFirst.mock.calls[0][0].where).toEqual({ id: 'v1', product: { storeId: 's1' } });
    expect(productVariant.updateMany.mock.calls[0][0]).toEqual({ where: { id: 'v1', stock: 5 }, data: { stock: 15 } });
    expect(stockMovement.create.mock.calls[0][0].data).toMatchObject({ storeId: 's1', label: 'Polera · M / Negro', delta: 10, stockAfter: 15, reason: 'RESTOCK' });
  });

  it('un conteo físico guarda la diferencia', async () => {
    const { svc, stockMovement } = fake(polera);
    await svc.adjust(owner, { variantId: 'v1', stock: 3, reason: 'ADJUSTMENT' });
    expect(stockMovement.create.mock.calls[0][0].data).toMatchObject({ delta: -2, stockAfter: 3 });
  });

  it('no deja el stock bajo cero ni toca variantes de otra tienda', async () => {
    await expect(fake(polera).svc.adjust(owner, { variantId: 'v1', delta: -6, reason: 'LOSS' })).rejects.toThrow(BadRequestException);
    await expect(fake(null).svc.adjust(owner, { variantId: 'x', delta: 1, reason: 'RESTOCK' })).rejects.toThrow(NotFoundException);
  });

  it('si una venta cambió el stock entre medio, no lo pisa', async () => {
    const { svc, stockMovement } = fake(polera, 0);
    await expect(svc.adjust(owner, { variantId: 'v1', delta: 1, reason: 'RETURN' })).rejects.toThrow(ConflictException);
    expect(stockMovement.create).not.toHaveBeenCalled();
  });

  it('el umbral de stock bajo es 3 si la tienda no eligió otro', () => {
    expect(lowStockThreshold({})).toBe(3);
    expect(lowStockThreshold({ lowStockThreshold: 0 })).toBe(0);
    expect(lowStockThreshold({ lowStockThreshold: 'x' })).toBe(3);
  });
});
