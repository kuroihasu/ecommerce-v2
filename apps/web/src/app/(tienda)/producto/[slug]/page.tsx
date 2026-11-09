import { notFound } from "next/navigation";
import { getProduct, products } from "@/designs/catalog";
import { getActiveTheme } from "@/themes/resolve";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export default async function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  if (!getProduct(slug)) notFound();
  const { def } = await getActiveTheme();
  return <def.Product slug={slug} />;
}
