import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import type {
  CategoryInput,
  CategoryPatch,
  ImagesInput,
  ProductInput,
  ProductPatch,
  StoreInput,
  VariantsInput,
} from './admin.schemas.js';

const productInclude = {
  category: { select: { id: true, slug: true, name: true } },
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: { position: 'asc' } },
} satisfies Prisma.ProductInclude;

// Escrituras del panel. Cada consulta filtra por la tienda del usuario
// (`access.id`), nunca por un id que venga solo en la URL o en el cuerpo.
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  // ─── Tienda: nombre, diseño y datos ─────────────────────────────────

  async getStore(access: StoreAccess) {
    return this.db.store.findUniqueOrThrow({
      where: { id: access.id },
      select: { slug: true, name: true, currency: true, theme: true, settings: true },
    });
  }

  async updateStore(access: StoreAccess, input: StoreInput) {
    if ((input.theme || input.settings) && access.role === 'STAFF') {
      throw new ForbiddenException('Solo dueños y administradores cambian el diseño y los datos de la tienda');
    }
    const current = await this.getStore(access);
    const prev = (current.settings ?? {}) as Record<string, unknown>;
    // Los textos se guardan por partes (barra de avisos y suscripción, cada una desde su
    // ventana), así que se mezclan en vez de reemplazarse.
    const settings = input.settings
      ? {
          ...prev,
          ...input.settings,
          ...(input.settings.texts ? { texts: { ...(prev.texts as object | undefined), ...input.settings.texts } } : {}),
        }
      : undefined;
    return this.db.store.update({
      where: { id: access.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.theme ? { theme: input.theme } : {}),
        ...(settings ? { settings: settings as Prisma.InputJsonObject } : {}),
      },
      select: { slug: true, name: true, currency: true, theme: true, settings: true },
    });
  }

  // ─── Productos ──────────────────────────────────────────────────────

  async listProducts(access: StoreAccess) {
    return this.db.product.findMany({
      where: { storeId: access.id },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(access: StoreAccess, id: string) {
    const product = await this.db.product.findFirst({ where: { id, storeId: access.id }, include: productInclude });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  // Un producto nuevo parte como borrador con una variante, para que se pueda
  // completar con calma antes de publicarlo.
  async createProduct(access: StoreAccess, input: ProductInput) {
    await this.assertCategory(access, input.categoryId);
    return this.unique(() =>
      this.db.product.create({
        data: {
          storeId: access.id,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          status: input.status ?? 'DRAFT',
          featured: input.featured ?? false,
          categoryId: input.categoryId ?? null,
          tags: input.tags ?? [],
          attributes: input.attributes ?? {},
          variants: { create: { name: 'Default', price: 0, stock: 0 } },
        },
        include: productInclude,
      }),
    );
  }

  async updateProduct(access: StoreAccess, id: string, input: ProductPatch) {
    await this.getProduct(access, id);
    await this.assertCategory(access, input.categoryId);
    return this.unique(() =>
      this.db.product.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          status: input.status,
          featured: input.featured,
          categoryId: input.categoryId,
          tags: input.tags,
          attributes: input.attributes,
        },
        include: productInclude,
      }),
    );
  }

  // "Eliminar" archiva: el producto desaparece de la tienda pero los pedidos
  // que lo incluyen siguen intactos.
  async archiveProduct(access: StoreAccess, id: string) {
    await this.getProduct(access, id);
    return this.db.product.update({ where: { id }, data: { status: 'ARCHIVED' }, include: productInclude });
  }

  // Reemplaza la lista de variantes: las que traen id se actualizan, las nuevas
  // se crean y las que ya no vienen se borran (los pedidos guardan su propia copia).
  async setVariants(access: StoreAccess, productId: string, input: VariantsInput) {
    const product = await this.getProduct(access, productId);
    const own = new Set(product.variants.map((v) => v.id));
    const foreign = input.find((v) => v.id && !own.has(v.id));
    if (foreign) throw new BadRequestException(`La variante ${foreign.id} no es de este producto`);
    const keep = input.flatMap((v) => (v.id ? [v.id] : []));
    await this.db.$transaction([
      this.db.productVariant.deleteMany({ where: { productId, id: { notIn: keep } } }),
      ...input.map((v, position) => {
        const data = {
          name: v.name,
          sku: v.sku ?? null,
          options: v.options,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          stock: v.stock,
          position,
        };
        return v.id
          ? this.db.productVariant.update({ where: { id: v.id }, data })
          : this.db.productVariant.create({ data: { ...data, productId } });
      }),
    ]);
    return this.getProduct(access, productId);
  }

  // Igual que las variantes: el orden de la lista es el orden de las fotos.
  async setImages(access: StoreAccess, productId: string, input: ImagesInput) {
    const product = await this.getProduct(access, productId);
    const own = new Set(product.images.map((i) => i.id));
    const foreign = input.find((i) => i.id && !own.has(i.id));
    if (foreign) throw new BadRequestException(`La foto ${foreign.id} no es de este producto`);
    const keep = input.flatMap((i) => (i.id ? [i.id] : []));
    await this.db.$transaction([
      this.db.productImage.deleteMany({ where: { productId, id: { notIn: keep } } }),
      ...input.map((img, position) => {
        const data = { url: img.url, alt: img.alt ?? null, color: img.color ?? null, position };
        return img.id
          ? this.db.productImage.update({ where: { id: img.id }, data })
          : this.db.productImage.create({ data: { ...data, productId } });
      }),
    ]);
    return this.getProduct(access, productId);
  }

  // ─── Categorías ─────────────────────────────────────────────────────

  async listCategories(access: StoreAccess) {
    return this.db.category.findMany({
      where: { storeId: access.id },
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(access: StoreAccess, input: CategoryInput) {
    return this.unique(() => this.db.category.create({ data: { ...input, storeId: access.id } }));
  }

  async updateCategory(access: StoreAccess, id: string, input: CategoryPatch) {
    const found = await this.db.category.findFirst({ where: { id, storeId: access.id }, select: { id: true } });
    if (!found) throw new NotFoundException('Categoría no encontrada');
    return this.unique(() => this.db.category.update({ where: { id }, data: input }));
  }

  // ─── Ayudas ─────────────────────────────────────────────────────────

  private async assertCategory(access: StoreAccess, categoryId: string | null | undefined) {
    if (!categoryId) return;
    const found = await this.db.category.findFirst({ where: { id: categoryId, storeId: access.id }, select: { id: true } });
    if (!found) throw new BadRequestException('La categoría no existe en esta tienda');
  }

  // Un slug repetido en la misma tienda responde 409 con un mensaje claro.
  private async unique<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe otro con esa dirección (slug) en la tienda');
      }
      throw e;
    }
  }
}
