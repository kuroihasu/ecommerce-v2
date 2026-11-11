import type { StoredTheme } from "@/themes/tokens";
import type { ChatConfig } from "@/designs/chat";
import type { HeroConfig } from "@/themes/hero";

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
  cost?: number | null;
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
  lowStockThreshold?: number;
  nextDrop?: { name: string; date: string } | null;
  hiddenSections?: string[];
  texts?: { announce?: string[]; newsletterTitle?: string; newsletterThanks?: string };
  discountPercent?: number;
  discountKind?: "PERCENT" | "FREE_SHIPPING";
  discountMin?: number;
  wheel?: WheelConfig;
  chat?: ChatConfig;
  hero?: HeroConfig;
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

// Inventario (ver apps/api/src/inventory).
export type StockReason = "ADJUSTMENT" | "RESTOCK" | "SALE" | "RETURN" | "LOSS";
export type InventoryItem = {
  variantId: string;
  productId: string;
  productName: string;
  status: ProductStatus;
  image: string | null;
  name: string;
  sku: string | null;
  stock: number;
  cost: number | null;
  price: number;
};
export type StockMovement = { id: string; variantId: string | null; label: string; sku: string | null; delta: number; stockAfter: number; reason: StockReason; note: string | null; createdAt: string };
export type StockAdjust = { variantId: string; delta?: number; stock?: number; reason: StockReason; note?: string };

// Contabilidad (ver apps/api/src/accounting). Montos con IVA salvo los "net".
export type LedgerKind = "INCOME" | "EXPENSE";
export type TaxDocument = "FACTURA" | "BOLETA" | "NONE";
export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  date: string;
  category: string;
  description: string;
  amount: number;
  taxAmount: number;
  document: TaxDocument;
  documentNumber: string | null;
  counterparty: string | null;
  counterpartyRut: string | null;
};
export type EntryPayload = Omit<LedgerEntry, "id">;
export type SaleLine = { id: string; number: number; date: string; email: string; status: string; products: number; shipping: number; discount: number; total: number; tax: number; units: number };
type CategoryTotal = { category: string; total: number };
export type AccountingSummary = {
  sales: { count: number; total: number; products: number; shipping: number; discounts: number; tax: number };
  income: { total: number; tax: number; byCategory: CategoryTotal[] };
  expense: { total: number; tax: number; byCategory: CategoryTotal[] };
  margin: { revenue: number; cost: number; profit: number; percent: number | null; unitsWithoutCost: number };
  netIncome: number;
  netExpenses: number;
  result: number;
  iva: { debit: number; credit: number; balance: number };
};
export type AccountingReport = { period: { from: string; to: string }; summary: AccountingSummary; sales: SaleLine[]; entries: LedgerEntry[] };
export type MonthRow = { month: string; sales: number; income: number; expenses: number };
