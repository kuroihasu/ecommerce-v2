import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import type { DiscountInput, DiscountPatch } from './discounts.schemas.js';

type Featured = { code: string; kind: 'PERCENT' | 'FREE_SHIPPING'; percent: number; minSubtotal: number; expiresAt: Date | null };

const NOT_AVAILABLE = 'Ese código no existe o ya no está disponible.';

// Códigos de descuento de cada tienda. El código "destacado" (el que muestran la barra
// de avisos y el carrito) se guarda en settings.discountCode y settings.discountPercent.
@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private assertManager(access: StoreAccess) {
    if (access.role === 'STAFF') throw new ForbiddenException('Solo dueños y administradores manejan los códigos de descuento');
  }

  private async settings(storeId: string) {
    const s = await this.db.store.findUniqueOrThrow({ where: { id: storeId }, select: { settings: true } });
    return (s.settings ?? {}) as Record<string, unknown>;
  }

  // Lo que la tienda necesita para anunciarlo: tipo, porcentaje, compra mínima y fecha
  // de término (para dejar de anunciarlo solo). null = no anunciar ninguno.
  private async setFeatured(storeId: string, d: Featured | null) {
    const settings = {
      ...(await this.settings(storeId)),
      discountCode: d?.code ?? '',
      discountKind: d?.kind ?? 'PERCENT',
      discountPercent: d?.percent ?? 0,
      discountMin: d?.minSubtotal ?? 0,
      discountExpiresAt: d?.expiresAt?.toISOString() ?? null,
    };
    await this.db.store.update({ where: { id: storeId }, data: { settings: settings as Prisma.InputJsonObject } });
  }

  private async find(access: StoreAccess, id: string) {
    const d = await this.db.discountCode.findFirst({ where: { id, storeId: access.id } });
    if (!d) throw new NotFoundException('Código no encontrado');
    return d;
  }

  private duplicate(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Ya existe un código con ese nombre');
    throw e;
  }

  async list(access: StoreAccess) {
    const [codes, settings] = await Promise.all([
      this.db.discountCode.findMany({ where: { storeId: access.id }, orderBy: { createdAt: 'desc' } }),
      this.settings(access.id),
    ]);
    return codes.map((c) => ({ ...c, featured: c.code === settings.discountCode }));
  }

  async create(access: StoreAccess, input: DiscountInput) {
    this.assertManager(access);
    try {
      return await this.db.discountCode.create({
        data: { ...input, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, storeId: access.id },
      });
    } catch (e) {
      this.duplicate(e);
    }
  }

  async update(access: StoreAccess, id: string, input: DiscountPatch) {
    this.assertManager(access);
    const before = await this.find(access, id);
    const kind = input.kind ?? before.kind;
    if (kind === 'FREE_SHIPPING') input = { ...input, percent: 0 };
    else if ((input.percent ?? before.percent) < 1) throw new BadRequestException('Indica un porcentaje de 1% a 90%');
    let after;
    try {
      after = await this.db.discountCode.update({
        where: { id: before.id },
        data: { ...input, ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}) },
      });
    } catch (e) {
      this.duplicate(e);
    }
    // Si era el destacado, la tienda sigue mostrando el nombre y el porcentaje al día;
    // si se pausó, deja de anunciarlo.
    let featured = (await this.settings(access.id)).discountCode === before.code;
    if (featured && after.active) await this.setFeatured(access.id, after);
    else if (featured) {
      await this.setFeatured(access.id, null);
      featured = false;
    }
    return { ...after, featured };
  }

  async remove(access: StoreAccess, id: string) {
    this.assertManager(access);
    const d = await this.find(access, id);
    await this.db.discountCode.delete({ where: { id: d.id } });
    if ((await this.settings(access.id)).discountCode === d.code) await this.setFeatured(access.id, null);
    return { ok: true };
  }

  async feature(access: StoreAccess, id: string) {
    this.assertManager(access);
    const d = await this.find(access, id);
    if (!d.active) throw new ConflictException('Activa el código antes de anunciarlo en la tienda');
    await this.setFeatured(access.id, d);
    return { ok: true };
  }

  // Lo que pregunta el carrito: ¿este código sirve hoy? No descuenta un uso.
  async check(storeSlug: string, code: string) {
    const d = await this.db.discountCode.findFirst({
      where: { code, active: true, store: { slug: storeSlug }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { code: true, kind: true, percent: true, minSubtotal: true, maxUses: true, usedCount: true },
    });
    if (!d || (d.maxUses !== null && d.usedCount >= d.maxUses)) throw new NotFoundException(NOT_AVAILABLE);
    // La compra mínima la revisa el carrito con su subtotal (y redeem al pagar).
    return { code: d.code, kind: d.kind, percent: d.percent, minSubtotal: d.minSubtotal };
  }

  // Descuenta un uso al confirmar un pedido, en una sola sentencia: si quedaba un
  // uso y dos clientes pagan a la vez, solo uno lo obtiene. Devuelve el porcentaje
  // aplicado o null si el código ya no sirve (o el pedido no llega a la compra
  // mínima). Lo llamará el checkout con el subtotal de productos del pedido.
  async redeem(storeId: string, code: string, subtotal: number): Promise<{ kind: 'PERCENT' | 'FREE_SHIPPING'; percent: number } | null> {
    const rows = await this.db.$queryRaw<{ kind: 'PERCENT' | 'FREE_SHIPPING'; percent: number }[]>`
      UPDATE "DiscountCode" SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
      WHERE "storeId" = ${storeId} AND "code" = ${code} AND "active"
        AND ("expiresAt" IS NULL OR "expiresAt" > now())
        AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
        AND "minSubtotal" <= ${subtotal}
      RETURNING "kind", "percent"`;
    return rows[0] ?? null;
  }
}
