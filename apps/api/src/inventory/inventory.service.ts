import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { StockReason } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import type { AdjustInput, CostInput } from './inventory.schemas.js';

export const DEFAULT_LOW_STOCK = 3;

// Stock por variante, ajustes con historial y alertas de stock bajo. Todas las
// consultas filtran por la tienda del usuario (`access.id`).
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async list(access: StoreAccess) {
    const [store, variants] = await Promise.all([
      this.db.store.findUniqueOrThrow({ where: { id: access.id }, select: { settings: true } }),
      this.db.productVariant.findMany({
        where: { product: { storeId: access.id } },
        orderBy: [{ product: { name: 'asc' } }, { position: 'asc' }],
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          cost: true,
          price: true,
          product: {
            select: { id: true, name: true, status: true, images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } },
          },
        },
      }),
    ]);
    const threshold = lowStockThreshold(store.settings);
    return {
      threshold,
      items: variants.map((v) => ({
        variantId: v.id,
        productId: v.product.id,
        productName: v.product.name,
        status: v.product.status,
        image: v.product.images[0]?.url ?? null,
        name: v.name,
        sku: v.sku,
        stock: v.stock,
        cost: v.cost,
        price: v.price,
      })),
    };
  }

  async movements(access: StoreAccess, variantId?: string) {
    const items = await this.db.stockMovement.findMany({
      where: { storeId: access.id, ...(variantId ? { variantId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return items;
  }

  // Suma, resta o fija el stock de una variante y lo anota en el historial.
  // La escritura exige que el stock siga siendo el que se leyó: si una venta lo
  // cambió entre medio, responde 409 en vez de pisarla.
  async adjust(access: StoreAccess, input: AdjustInput) {
    const variant = await this.findVariant(access, input.variantId);
    const next = input.stock ?? variant.stock + input.delta!;
    if (next < 0) throw new BadRequestException(`Solo hay ${variant.stock} unidades de ${variant.name}`);
    const delta = next - variant.stock;
    if (delta === 0) throw new BadRequestException('El stock ya es ese');
    return this.apply(access, variant, delta, next, input.reason, input.note);
  }

  async setCost(access: StoreAccess, variantId: string, input: CostInput) {
    await this.findVariant(access, variantId);
    return this.db.productVariant.update({ where: { id: variantId }, data: { cost: input.cost }, select: { id: true, cost: true } });
  }

  private async apply(
    access: StoreAccess,
    variant: { id: string; name: string; sku: string | null; stock: number; product: { name: string } },
    delta: number,
    next: number,
    reason: StockReason,
    note?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const updated = await tx.productVariant.updateMany({ where: { id: variant.id, stock: variant.stock }, data: { stock: next } });
      if (updated.count === 0) {
        throw new ConflictException('El stock cambió mientras lo editabas. Recarga la página y vuelve a intentarlo.');
      }
      const movement = await tx.stockMovement.create({
        data: {
          storeId: access.id,
          variantId: variant.id,
          label: `${variant.product.name} · ${variant.name}`,
          sku: variant.sku,
          delta,
          stockAfter: next,
          reason,
          note: note || null,
        },
      });
      return { variantId: variant.id, stock: next, movement };
    });
  }

  private async findVariant(access: StoreAccess, id: string) {
    const variant = await this.db.productVariant.findFirst({
      where: { id, product: { storeId: access.id } },
      select: { id: true, name: true, sku: true, stock: true, product: { select: { name: true } } },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    return variant;
  }
}

export function lowStockThreshold(settings: unknown) {
  const n = (settings as { lowStockThreshold?: unknown } | null)?.lowStockThreshold;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : DEFAULT_LOW_STOCK;
}
