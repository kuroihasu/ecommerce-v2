import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Lo que la tienda muestra de sus ajustes. Los códigos de los premios de la ruleta se
// quitan: el cliente los recibe recién al dejar su correo. Si el código anunciado ya
// venció, deja de anunciarse (la vitrina no puede mirar la hora al prerenderizar).
export function publicSettings(settings: unknown, now = new Date()) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return settings;
  const s = { ...settings } as Record<string, unknown> & { wheel?: { prizes?: { label: string; code?: string }[] }; discountExpiresAt?: string | null };
  if (s.discountExpiresAt && new Date(s.discountExpiresAt) <= now) Object.assign(s, { discountCode: '', discountPercent: 0 });
  if (s.wheel) s.wheel = { ...s.wheel, prizes: (s.wheel.prizes ?? []).map((p) => ({ label: p.label, won: Boolean(p.code) })) };
  return s;
}

// Lectura pública del catálogo de una tienda (lo que ve el comprador).
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getStore(slug: string) {
    const store = await this.prisma.client.store.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, currency: true, theme: true, settings: true },
    });
    if (!store) throw new NotFoundException(`Tienda "${slug}" no existe`);
    return { ...store, settings: publicSettings(store.settings) };
  }

  async listCategories(storeSlug: string) {
    const store = await this.getStore(storeSlug);
    return this.prisma.client.category.findMany({
      where: { storeId: store.id },
      orderBy: { position: 'asc' },
    });
  }

  async listProducts(storeSlug: string, opts: { category?: string; featured?: boolean }) {
    const store = await this.getStore(storeSlug);
    return this.prisma.client.product.findMany({
      where: {
        storeId: store.id,
        status: 'ACTIVE',
        ...(opts.featured ? { featured: true } : {}),
        ...(opts.category ? { category: { slug: opts.category } } : {}),
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Todo lo que necesita la vitrina en una sola llamada: tienda, categorías con
  // productos activos y productos (con fotos y variantes).
  async getCatalog(storeSlug: string) {
    const store = await this.getStore(storeSlug);
    const [categories, products] = await Promise.all([
      this.prisma.client.category.findMany({
        where: { storeId: store.id, products: { some: { status: 'ACTIVE' } } },
        orderBy: { position: 'asc' },
        select: { id: true, slug: true, name: true, description: true, imageUrl: true },
      }),
      this.prisma.client.product.findMany({
        where: { storeId: store.id, status: 'ACTIVE' },
        include: {
          category: { select: { slug: true } },
          images: { orderBy: { position: 'asc' } },
          variants: { orderBy: { position: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { store, categories, products };
  }

  async getProduct(storeSlug: string, productSlug: string) {
    const store = await this.getStore(storeSlug);
    const product = await this.prisma.client.product.findFirst({
      where: { storeId: store.id, slug: productSlug, status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException(`Producto "${productSlug}" no existe`);
    return product;
  }
}
