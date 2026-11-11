// Datos de ejemplo: la tienda demo "NORTE" (ropa urbana y moda mujer) con
// categorías, productos con fotos por color y variantes de talla y color.
//
// Corre en cada deploy de la API cuando SEED_DEMO=true, así que es idempotente:
// crea lo que falta y no pisa lo que ya editó la tienda.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createPrismaClient } from "../src/index.js";

type DemoData = {
  store: { name: string; settings: Record<string, unknown> };
  categories: { slug: string; name: string; description: string; imageUrl: string }[];
  products: {
    slug: string;
    name: string;
    category: string;
    description: string;
    featured: boolean;
    tags: string[];
    attributes: Record<string, unknown>;
    images: { url: string; color?: string }[];
    variants: {
      name: string;
      sku: string;
      options: Record<string, string>;
      price: number;
      compareAtPrice: number | null;
      stock: number;
    }[];
  }[];
};

const demo = JSON.parse(
  readFileSync(new URL("./demo-norte.json", import.meta.url), "utf8"),
) as DemoData;

// Productos de la primera versión de la demo (tienda de hogar), que ya no se muestran.
const LEGACY_SLUGS = ["taza-ceramica", "vela-cedro", "manta-merino"];
const THEME = { template: "atelier" };

const prisma = createPrismaClient();

async function main() {
  const existing = await prisma.store.findUnique({ where: { slug: "demo" } });
  // El tema y los datos de tienda se escriben solo si siguen siendo los de la demo
  // anterior (sin `template`); si ya se eligieron desde el panel, se respetan.
  const legacy = !existing || !(existing.theme as { template?: string } | null)?.template;
  const store = await prisma.store.upsert({
    where: { slug: "demo" },
    update: legacy ? { name: demo.store.name, theme: THEME, settings: demo.store.settings as object } : {},
    create: { slug: "demo", name: demo.store.name, theme: THEME, settings: demo.store.settings as object },
  });

  // El código destacado de la demo también existe como código real (10%, ilimitado).
  const featured = (store.settings as { discountCode?: string } | null)?.discountCode;
  if (featured) {
    await prisma.discountCode.upsert({
      where: { storeId_code: { storeId: store.id, code: featured } },
      update: {},
      create: { storeId: store.id, code: featured, percent: 10 },
    });
  }

  await prisma.product.updateMany({
    where: { storeId: store.id, slug: { in: LEGACY_SLUGS } },
    data: { status: "ARCHIVED" },
  });

  const categoryIds = new Map<string, string>();
  for (const [position, c] of demo.categories.entries()) {
    const row = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: c.slug } },
      update: legacy ? { ...c, position } : {},
      create: { ...c, position, storeId: store.id },
    });
    categoryIds.set(c.slug, row.id);
  }

  // La API ordena por fecha de creación descendente: el primero de la lista queda arriba.
  const now = Date.now();
  let created = 0;
  for (const [i, p] of demo.products.entries()) {
    const found = await prisma.product.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: p.slug } },
      select: { id: true },
    });
    if (found) continue;
    await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: categoryIds.get(p.category),
        name: p.name,
        slug: p.slug,
        description: p.description,
        status: "ACTIVE",
        featured: p.featured,
        tags: p.tags,
        attributes: p.attributes as object,
        createdAt: new Date(now - i * 1000),
        images: {
          create: p.images.map((img, position) => ({ url: img.url, color: img.color, alt: p.name, position })),
        },
        variants: {
          create: p.variants.map((v, position) => ({ ...v, position })),
        },
      },
    });
    created++;
  }

  console.log(`Tienda "${store.name}" lista: ${created} productos nuevos, ${demo.products.length} en la demo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
