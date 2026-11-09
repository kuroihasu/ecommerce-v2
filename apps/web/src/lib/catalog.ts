import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import {
  demoCatalog,
  type Badge,
  type Catalog,
  type CategoryInfo,
  type Color,
  type DemoProduct,
  type Line,
  type LineInfo,
  type StoreInfo,
} from "@/designs/catalog";
import type { StoredTheme } from "@/themes/tokens";

// Datos de la tienda desde la API NestJS, traducidos al modelo que usan los diseños.
// La tienda activa sale de STORE_SLUG (más adelante, en la plataforma, por dominio).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const STORE_SLUG = process.env.STORE_SLUG ?? "demo";

// ─── Forma de la respuesta de GET /stores/:slug/catalog ─────────────

type ApiStore = { slug: string; name: string; currency: string; theme: unknown; settings: unknown };
type ApiCategory = { slug: string; name: string; description: string | null; imageUrl: string | null };
type ApiVariant = {
  id: string;
  name: string;
  options: Record<string, string> | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
};
export type ApiProduct = {
  slug: string;
  name: string;
  description: string | null;
  featured: boolean;
  tags: string[] | null;
  attributes: { short?: string; details?: string[]; colors?: Color[] } | null;
  category: { slug: string } | null;
  images: { url: string; alt: string | null; color: string | null }[];
  variants: ApiVariant[];
};
export type ApiCatalog = { store: ApiStore; categories: ApiCategory[]; products: ApiProduct[] };

export type StoreData = { catalog: Catalog; theme: StoredTheme | null; source: "api" | "demo" };

const BADGES: Badge[] = ["preventa", "ultimas", "nuevo"];
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const unique = <T,>(xs: T[]) => [...new Set(xs)];

export function toProduct(p: ApiProduct): DemoProduct | null {
  if (!p.variants.length) return null;
  const tags = p.tags ?? [];
  const attrs = p.attributes ?? {};
  const variants = p.variants.map((v) => ({
    id: v.id,
    name: v.name,
    color: v.options?.Color ?? "",
    size: v.options?.Talla ?? "Única",
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? undefined,
    stock: v.stock,
  }));
  // Sin opción de color, las variantes toman el nombre del único color que se muestra.
  if (variants.every((v) => !v.color)) variants.forEach((v) => (v.color = attrs.colors?.[0]?.name ?? "Único"));
  const colors: Color[] = unique(variants.map((v) => v.color)).map(
    (name) => attrs.colors?.find((c) => c.name === name) ?? { name, hex: "#9a9a96" },
  );
  const sizes = unique(variants.map((v) => v.size));
  const soldOut = sizes.filter((s) => variants.filter((v) => v.size === s).every((v) => v.stock <= 0));
  const cheapest = variants.reduce((a, b) => (b.price < a.price ? b : a));

  const general = p.images.filter((i) => !i.color).map((i) => i.url);
  const gallery = general.length ? general : p.images.map((i) => i.url);
  const colorPhotos: Record<string, string[]> = {};
  for (const img of p.images) if (img.color) (colorPhotos[img.color] ??= []).push(img.url);
  const image = gallery[0] ?? "";

  return {
    slug: p.slug,
    name: p.name,
    category: p.category?.slug ?? "",
    line: (tags.find((t) => t === "mujer" || t === "hombre") as Line | undefined) ?? "unisex",
    short: attrs.short ?? "",
    description: p.description ?? "",
    details: attrs.details ?? [],
    colors,
    sizes,
    soldOut: soldOut.length ? soldOut : undefined,
    price: cheapest.price,
    compareAtPrice: cheapest.compareAtPrice,
    image,
    hover: gallery[1] ?? image,
    gallery: gallery.length ? gallery : [image],
    colorPhotos: Object.keys(colorPhotos).length ? colorPhotos : undefined,
    badge: BADGES.find((b) => tags.includes(b)),
    featured: p.featured,
    variants,
  };
}

export function toCatalog(data: ApiCatalog): Catalog {
  const settings = isObject(data.store.settings) ? data.store.settings : {};
  const { lines, ...rest } = settings as Partial<StoreInfo> & { lines?: LineInfo[] };
  // Lo que la tienda no haya configurado aún toma el valor de la muestra.
  const store: StoreInfo = { ...demoCatalog.store, ...rest, name: data.store.name };
  const categories: CategoryInfo[] = data.categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    blurb: c.description ?? "",
    image: c.imageUrl ?? "",
  }));
  const products = data.products.map(toProduct).filter((p): p is DemoProduct => !!p);
  return { store, categories, lines: Array.isArray(lines) ? lines : demoCatalog.lines, products };
}

// Se cachea por unos minutos. Cuando el panel guarde productos o el tema,
// basta con revalidateTag("store").
async function fetchStoreData(): Promise<StoreData> {
  "use cache";
  cacheTag("store", "store-theme");
  cacheLife("minutes");
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_SLUG}/catalog`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as ApiCatalog;
    return {
      catalog: toCatalog(data),
      theme: isObject(data.store.theme) ? (data.store.theme as StoredTheme) : null,
      source: "api",
    };
  } catch {
    // Sin API (desarrollo local o caída), la tienda sigue mostrándose con la muestra.
    return { catalog: demoCatalog, theme: null, source: "demo" };
  }
}

export const getStoreData = cache(fetchStoreData);
export const getCatalog = async () => (await getStoreData()).catalog;
