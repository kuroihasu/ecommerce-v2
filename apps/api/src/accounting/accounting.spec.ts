import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { AccountingService } from './accounting.service.js';
import { EntryInput, Period } from './accounting.schemas.js';
import { chileDayStart, monthsBack } from './period.js';
import { computeSummary, ivaOf } from './summary.js';

const owner: StoreAccess = { id: 's1', slug: 'demo', role: 'OWNER' };
const staff: StoreAccess = { ...owner, role: 'STAFF' };

describe('fechas de Chile', () => {
  it('el día empieza a medianoche de Chile, con o sin horario de verano', () => {
    expect(chileDayStart('2026-07-15').toISOString()).toBe('2026-07-15T04:00:00.000Z');
    expect(chileDayStart('2026-12-15').toISOString()).toBe('2026-12-15T03:00:00.000Z');
  });

  it('cuenta los últimos 12 meses con el actual al final', () => {
    const months = monthsBack(new Date('2026-11-11T15:00:00Z'), 12);
    expect(months[0]).toBe('2025-12');
    expect(months.at(-1)).toBe('2026-11');
  });
});

describe('esquemas', () => {
  it('una boleta de compra no da crédito fiscal: su IVA queda en 0', () => {
    const e = EntryInput.parse({ kind: 'EXPENSE', date: '2026-11-03', category: 'Arriendo', description: 'Bodega', amount: 119000, taxAmount: 19000, document: 'BOLETA' });
    expect(e.taxAmount).toBe(0);
    const f = EntryInput.parse({ kind: 'EXPENSE', date: '2026-11-03', category: 'Mercadería', description: 'Poleras', amount: 119000, taxAmount: 19000, document: 'FACTURA', counterpartyRut: '76.123.456-k' });
    expect(f).toMatchObject({ taxAmount: 19000, counterpartyRut: '76.123.456-K' });
  });

  it('rechaza un IVA mayor al total, fechas inválidas y períodos al revés', () => {
    expect(EntryInput.safeParse({ kind: 'INCOME', date: '2026-11-03', category: 'Feria', description: 'x', amount: 100, taxAmount: 200, document: 'BOLETA' }).success).toBe(false);
    expect(EntryInput.safeParse({ kind: 'INCOME', date: '2026-02-30', category: 'Feria', description: 'x', amount: 100 }).success).toBe(false);
    expect(Period.safeParse({ from: '2026-11-30', to: '2026-11-01' }).success).toBe(false);
  });
});

describe('computeSummary', () => {
  it('separa el IVA de las ventas y lo compensa con el de las facturas de compra', () => {
    const s = computeSummary(
      [{ total: 119000, subtotal: 115000, shippingTotal: 4000, discountTotal: 0, items: [{ quantity: 2, unitPrice: 57500, variant: { cost: 20000 } }] }],
      [
        { kind: 'INCOME', category: 'Feria', amount: 59500, taxAmount: 9500 },
        { kind: 'EXPENSE', category: 'Mercadería', amount: 59500, taxAmount: 9500 },
        { kind: 'EXPENSE', category: 'Arriendo', amount: 30000, taxAmount: 0 },
      ],
    );
    expect(ivaOf(119000)).toBe(19000);
    expect(s.iva).toEqual({ debit: 28500, credit: 9500, balance: 19000 });
    expect(s.netIncome).toBe(100000 + 50000);
    expect(s.netExpenses).toBe(50000 + 30000);
    expect(s.result).toBe(70000);
    expect(s.margin).toMatchObject({ revenue: 115000, cost: 40000, profit: 75000, unitsWithoutCost: 0 });
    expect(s.expense.byCategory[0]).toEqual({ category: 'Mercadería', total: 59500 });
  });

  it('los productos sin costo no entran al margen pero se cuentan', () => {
    const s = computeSummary([{ total: 10000, subtotal: 10000, shippingTotal: 0, discountTotal: 0, items: [{ quantity: 3, unitPrice: 3000, variant: { cost: null } }] }], []);
    expect(s.margin).toMatchObject({ revenue: 0, percent: null, unitsWithoutCost: 3 });
  });
});

describe('AccountingService', () => {
  it('el personal no ve la contabilidad', async () => {
    const svc = new AccountingService({ client: {} } as unknown as PrismaService);
    await expect(svc.report(staff, { from: '2026-11-01', to: '2026-11-30' })).rejects.toThrow(ForbiddenException);
  });

  it('solo cuenta pedidos pagados de la tienda, dentro de los días de Chile', async () => {
    const order = { findMany: vi.fn().mockResolvedValue([]) };
    const ledgerEntry = { findMany: vi.fn().mockResolvedValue([]) };
    const svc = new AccountingService({ client: { order, ledgerEntry } } as unknown as PrismaService);
    await svc.report(owner, { from: '2026-11-01', to: '2026-11-30' });
    const where = order.findMany.mock.calls[0][0].where;
    expect(where.storeId).toBe('s1');
    expect(where.status.in).toEqual(['PAID', 'FULFILLED', 'DELIVERED']);
    expect(where.createdAt.gte.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(where.createdAt.lt.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(ledgerEntry.findMany.mock.calls[0][0].where.storeId).toBe('s1');
  });

  it('no edita movimientos de otra tienda', async () => {
    const ledgerEntry = { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() };
    const svc = new AccountingService({ client: { ledgerEntry } } as unknown as PrismaService);
    const input = EntryInput.parse({ kind: 'INCOME', date: '2026-11-03', category: 'Feria', description: 'x', amount: 100 });
    await expect(svc.updateEntry(owner, 'ajeno', input)).rejects.toThrow('no encontrado');
    expect(ledgerEntry.findFirst.mock.calls[0][0].where).toEqual({ id: 'ajeno', storeId: 's1' });
    expect(ledgerEntry.update).not.toHaveBeenCalled();
  });
});
