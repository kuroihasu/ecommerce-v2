import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import type { DiscountInput, DiscountPatch } from './discounts.schemas.js';

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

  // También se guarda la fecha de término, para que la tienda deje de anunciarlo solo.
  private async setFeatured(storeId: string, code: string, percent: number, expiresAt: Date | null = null) {
    const settings = { ...(await this.settings(storeId)), discountCode: code, discountPercent: percent, discountExpiresAt: expiresAt?.toISOString() ?? null };
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
    if (featured && after.active) await this.setFeatured(access.id, after.code, after.percent, after.expiresAt);
    else if (featured) {
      await this.setFeatured(access.id, '', 0);
      featured = false;
    }
    return { ...after, featured };
  }

  async remove(access: StoreAccess, id: string) {
    this.assertManager(access);
    const d = await this.find(access, id);
    await this.db.discountCode.delete({ where: { id: d.id } });
    if ((await this.settings(access.id)).discountCode === d.code) await this.setFeatured(access.id, '', 0);
    return { ok: true };
  }

  async feature(access: StoreAccess, id: string) {
    this.assertManager(access);
    const d = await this.find(access, id);
    if (!d.active) throw new ConflictException('Activa el código antes de anunciarlo en la tienda');
    await this.setFeatured(access.id, d.code, d.percent, d.expiresAt);
    return { ok: true };
  }

  // Lo que pregunta el carrito: ¿este código sirve hoy? No descuenta un uso.
  async check(storeSlug: string, code: string) {
    const d = await this.db.discountCode.findFirst({
      where: { code, active: true, store: { slug: storeSlug }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { code: true, percent: true, maxUses: true, usedCount: true },
    });
    if (!d || (d.maxUses !== null && d.usedCount >= d.maxUses)) throw new NotFoundException(NOT_AVAILABLE);
    return { code: d.code, percent: d.percent };
  }

  // Descuenta un uso al confirmar un pedido, en una sola sentencia: si quedaba un
  // uso y dos clientes pagan a la vez, solo uno lo obtiene. Devuelve el porcentaje
  // aplicado o null si el código ya no sirve. Lo llamará el checkout.
  async redeem(storeId: string, code: string): Promise<number | null> {
    const rows = await this.db.$queryRaw<{ percent: number }[]>`
      UPDATE "DiscountCode" SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
      WHERE "storeId" = ${storeId} AND "code" = ${code} AND "active"
        AND ("expiresAt" IS NULL OR "expiresAt" > now())
        AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
      RETURNING "percent"`;
    return rows[0]?.percent ?? null;
  }
}
