import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProduct } from "@/designs/catalog";
import { photoUrl } from "@/designs/images";
import { TrackViewItem } from "@/designs/Pixels";
import { getCatalog } from "@/lib/catalog";
import { getActiveTheme } from "@/themes/resolve";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

// Título, descripción y foto que se ven al compartir el producto en WhatsApp,
// Instagram o Facebook, y en los resultados de Google.
export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCatalog();
  const p = findProduct(catalog, slug);
  if (!p) return {};
  const title = `${p.name} · ${catalog.store.name}`;
  const description = p.short || p.description.slice(0, 160);
  const images = [p.image, ...p.gallery].filter(Boolean).slice(0, 4).map((i) => photoUrl(i));
  return {
    title,
    description,
    openGraph: { title, description, images, type: "website", siteName: catalog.store.name, locale: "es_CL" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const p = findProduct(await getCatalog(), slug);
  if (!p) notFound();
  const { def } = await getActiveTheme();
  return (
    <>
      <def.Product slug={slug} />
      <TrackViewItem slug={p.slug} name={p.name} price={p.price} />
    </>
  );
}
