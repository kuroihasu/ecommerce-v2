import type { StoredTheme } from "@/themes/tokens";
import type { ChatConfig } from "@/designs/chat";

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
  texts?: { announce?: string[]; newsletterTitle?: string; newsletterThanks?: string };
  discountPercent?: number;
  discountKind?: "PERCENT" | "FREE_SHIPPING";
  discountMin?: number;
  wheel?: WheelConfig;
  chat?: ChatConfig;
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

// Cuentas de Meta y Google conectadas (ver apps/api/src/integrations).
export type IntegrationSlug = "meta" | "google";
export type IntegrationStatus = {
  provider: IntegrationSlug;
  name: string;
  available: boolean;
  connected: boolean;
  expired: boolean;
  accountName: string | null;
  connectedAt: string | null;
};
export type SocialPost = { id: string; caption: string; type: string; image: string | null; url: string; date: string; likes: number | null; comments: number | null };
export type Campaign = { name: string; status?: string; spend: number; impressions: number; clicks: number; ctr: number; purchases: number; revenue: number };
export type Insights = {
  instagram: { username: string; followers: number | null; posts: SocialPost[] } | null;
  ads: { account: string | null; currency: string; campaigns: Campaign[] } | null;
};

// Códigos de descuento (ver apps/api/src/discounts). maxUses null = ilimitado.
export type AdminDiscount = {
  id: string;
  code: string;
  kind: "PERCENT" | "FREE_SHIPPING";
  percent: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  featured: boolean;
};
export type DiscountPayload = Pick<AdminDiscount, "code" | "kind" | "percent" | "minSubtotal" | "maxUses" | "active" | "expiresAt">;

// Ruleta de regalos (settings.wheel). code vacío = premio sin descuento.
export type WheelPrizeConfig = { label: string; code: string; weight: number };
export type WheelConfig = { enabled: boolean; title: string; subtitle: string; delaySeconds: number; prizes: WheelPrizeConfig[] };
export type Subscriber = { email: string; source: string; prize: string | null; createdAt: string };
