import { notFound } from "next/navigation";
import { findProduct } from "@/designs/catalog";
import { getCatalog } from "@/lib/catalog";
import { getActiveTheme } from "@/themes/resolve";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  if (!findProduct(await getCatalog(), slug)) notFound();
  const { def } = await getActiveTheme();
  return <def.Product slug={slug} />;
}
