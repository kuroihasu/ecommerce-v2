import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import type { EntryInput, Period } from './accounting.schemas.js';
import { addDays, chileDay, chileDayStart, dateOnly, isoDay, monthsBack } from './period.js';
import { computeSummary, ivaOf } from './summary.js';

// Pedidos que cuentan como venta: pagados, despachados o entregados.
// Pendientes, cancelados y reembolsados no suman.
export const SOLD: OrderStatus[] = ['PAID', 'FULFILLED', 'DELIVERED'];

const entryOut = <T extends { date: Date }>(e: T) => ({ ...e, date: isoDay(e.date) });

// Contabilidad básica de la tienda: ventas online (de `Order`), ingresos y gastos
// anotados a mano, IVA estimado y resultado del período. Solo dueños y administradores.
@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private assertCanSee(access: StoreAccess) {
    if (access.role === 'STAFF') throw new ForbiddenException('Solo dueños y administradores ven la contabilidad');
  }

  // Resumen, libro de ventas y movimientos de un período (días de Chile, ambos incluidos).
  async report(access: StoreAccess, period: Period) {
    this.assertCanSee(access);
    const [orders, entries] = await Promise.all([this.orders(access.id, period.from, period.to), this.entries(access.id, period.from, period.to)]);
    return {
      period,
      summary: computeSummary(orders, entries),
      sales: orders.map((o) => ({
        id: o.id,
        number: o.number,
        date: o.createdAt,
        email: o.email,
        status: o.status,
        products: o.subtotal,
        shipping: o.shippingTotal,
        discount: o.discountTotal,
        total: o.total,
        tax: ivaOf(o.total),
        units: o.items.reduce((s, i) => s + i.quantity, 0),
      })),
      entries: entries.map(entryOut),
    };
  }

  // Ventas, otros ingresos y gastos de cada uno de los últimos meses (para el gráfico).
  async monthly(access: StoreAccess, months: number, now = new Date()) {
    this.assertCanSee(access);
    const keys = monthsBack(now, months);
    const from = `${keys[0]}-01`;
    const to = chileDay(now);
    const [orders, entries] = await Promise.all([this.orders(access.id, from, to), this.entries(access.id, from, to)]);
    const rows = new Map(keys.map((month) => [month, { month, sales: 0, income: 0, expenses: 0 }]));
    for (const o of orders) {
      const row = rows.get(chileDay(o.createdAt).slice(0, 7));
      if (row) row.sales += o.total;
    }
    for (const e of entries) {
      const row = rows.get(isoDay(e.date).slice(0, 7));
      if (!row) continue;
      if (e.kind === 'INCOME') row.income += e.amount;
      else row.expenses += e.amount;
    }
    return [...rows.values()];
  }

  async createEntry(access: StoreAccess, input: EntryInput) {
    this.assertCanSee(access);
    const entry = await this.db.ledgerEntry.create({ data: { ...input, date: dateOnly(input.date), storeId: access.id } });
    return entryOut(entry);
  }

  async updateEntry(access: StoreAccess, id: string, input: EntryInput) {
    this.assertCanSee(access);
    await this.findEntry(access, id);
    const entry = await this.db.ledgerEntry.update({ where: { id }, data: { ...input, date: dateOnly(input.date) } });
    return entryOut(entry);
  }

  async deleteEntry(access: StoreAccess, id: string) {
    this.assertCanSee(access);
    await this.findEntry(access, id);
    await this.db.ledgerEntry.delete({ where: { id } });
    return { ok: true };
  }

  private async findEntry(access: StoreAccess, id: string) {
    const found = await this.db.ledgerEntry.findFirst({ where: { id, storeId: access.id }, select: { id: true } });
    if (!found) throw new NotFoundException('Movimiento no encontrado');
  }

  private orders(storeId: string, from: string, to: string) {
    return this.db.order.findMany({
      where: { storeId, status: { in: SOLD }, createdAt: { gte: chileDayStart(from), lt: chileDayStart(addDays(to, 1)) } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: {
        id: true,
        number: true,
        createdAt: true,
        email: true,
        status: true,
        subtotal: true,
        shippingTotal: true,
        discountTotal: true,
        total: true,
        items: { select: { quantity: true, unitPrice: true, variant: { select: { cost: true } } } },
      },
    });
  }

  private entries(storeId: string, from: string, to: string) {
    return this.db.ledgerEntry.findMany({
      where: { storeId, date: { gte: dateOnly(from), lte: dateOnly(to) } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });
  }
}
