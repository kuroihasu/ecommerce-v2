// Datos de ejemplo: una tienda demo con categorías y productos.
import "dotenv/config";
import { createPrismaClient } from "../src/index.js";

const prisma = createPrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Tienda Demo",
      theme: { primary: "#111111", accent: "#c8a165", font: "Inter" },
      settings: { email: "hola@tiendademo.cl", instagram: "@tiendademo" },
    },
  });

  const categories = [
    { name: "Hogar", slug: "hogar" },
    { name: "Accesorios", slug: "accesorios" },
  ];
  for (const [position, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: c.slug } },
      update: {},
      create: { ...c, position, storeId: store.id },
    });
  }
  const hogar = await prisma.category.findUniqueOrThrow({
    where: { storeId_slug: { storeId: store.id, slug: "hogar" } },
  });

  const products = [
    { name: "Taza de cerámica artesanal", slug: "taza-ceramica", price: 12990, stock: 25 },
    { name: "Vela de soya aroma cedro", slug: "vela-cedro", price: 9990, stock: 40 },
    { name: "Manta de lana merino", slug: "manta-merino", price: 49990, stock: 8 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug: p.slug } },
      update: {},
      create: {
        storeId: store.id,
        categoryId: hogar.id,
        name: p.name,
        slug: p.slug,
        status: "ACTIVE",
        featured: true,
        variants: { create: { price: p.price, stock: p.stock, sku: p.slug.toUpperCase() } },
      },
    });
  }

  console.log(`Tienda "${store.name}" lista con ${products.length} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
