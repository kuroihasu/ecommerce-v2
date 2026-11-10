import type { StoredTheme } from "@/themes/tokens";

// Respuestas de /admin/stores/:store (ver apps/api/src/admin).
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AdminImage = { id?: string; url: string; alt: string | null; color: string | null };
export type AdminVariant = {
  id?: string;
  name: string;
  sku: string | null;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
};
export type ProductColor = { name: string; hex: string };
export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  featured: boolean;
  categoryId: string | null;
  category: { id: string; slug: string; name: string } | null;
  tags: string[];
  attributes: { short?: string; details?: string[]; colors?: ProductColor[] };
  images: AdminImage[];
  variants: AdminVariant[];
  updatedAt: string;
};
export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  _count: { products: number };
};
export type StoreSettings = {
  tagline?: string;
  email?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  discountCode?: string;
  shippingRM?: number;
  shippingRegions?: number;
  freeShippingFrom?: number;
  installments?: number;
  nextDrop?: { name: string; date: string } | null;
  hiddenSections?: string[];
  facebook?: string;
  tracking?: { metaPixelId?: string; ga4Id?: string; googleAdsId?: string; tiktokPixelId?: string };
};
export type AdminStore = { slug: string; name: string; currency: string; theme: StoredTheme; settings: StoreSettings };

// Lo que el editor de producto manda al guardar.
export type ProductPayload = {
  product: Pick<AdminProduct, "name" | "slug" | "description" | "status" | "featured" | "categoryId" | "tags" | "attributes">;
  images: AdminImage[];
  variants: AdminVariant[];
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
