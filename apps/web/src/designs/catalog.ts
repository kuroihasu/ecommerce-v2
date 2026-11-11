// Modelo de catálogo que usan los diseños, más un catálogo de muestra: una marca
// de ropa chilena (streetwear + moda mujer) con tallas, colores, ofertas y preventas.
// Los datos reales salen de la API (lib/catalog.ts); esta muestra es el respaldo
// cuando la API no responde, por ejemplo en desarrollo sin base de datos.

import type { StoreTexts } from "@/themes/texts";

export type Badge = "nuevo" | "preventa" | "ultimas";
export type Line = "mujer" | "hombre" | "unisex";
export type CategorySlug = string;
export type Color = { name: string; hex: string };
export type DemoVariant = { id: string; name: string; color: string; size: string; price: number; compareAtPrice?: number; stock: number };

export type DemoProduct = {
  slug: string;
  name: string;
  category: CategorySlug;
  line: Line;
  short: string;
  description: string;
  details: string[];
  colors: Color[];
  sizes: string[];
  soldOut?: string[];
  price: number;
  compareAtPrice?: number;
  image: string;
  hover: string;
  gallery: string[];
  // Fotos propias de cada color (si no hay, se usa `gallery`).
  colorPhotos?: Record<string, string[]>;
  badge?: Badge;
  featured?: boolean;
  variants: DemoVariant[];
};

const store = {
  name: "NORTE",
  tagline: "Ropa urbana hecha en Santiago",
  email: "hola@norte.cl",
  instagram: "@norte.cl",
  tiktok: "@norte.cl",
  whatsapp: "+56 9 1234 5678",
  // Código destacado (Descuentos): lo anuncian la barra de avisos y la suscripción.
  discountCode: "NORTECLUB",
  discountKind: "PERCENT" as "PERCENT" | "FREE_SHIPPING",
  discountPercent: 10,
  // Compra mínima en productos para usar el código destacado (0 = sin mínimo).
  discountMin: 0,
  discountExpiresAt: null as string | null,
  shippingRM: 3500,
  shippingRegions: 5990,
  freeShippingFrom: 60000,
  installments: 6,
  // Próximo lanzamiento (para la cuenta regresiva de la dirección Vitrina).
  nextDrop: { name: "Drop 027 · Invierno", date: "2026-11-21T19:00:00-03:00" } as { name: string; date: string } | null,
  facebook: "",
  // Píxeles de publicidad configurados en el panel (Redes y publicidad).
  tracking: {} as Tracking,
  // Secciones ocultas desde el panel (Avanzado). Ver src/themes/sections.ts.
  hiddenSections: [] as string[],
  // Textos propios de la barra de avisos y la suscripción. Ver src/themes/texts.ts.
  texts: {} as StoreTexts,
  // Ruleta de regalos (panel > Ruleta de regalos). La API no manda los códigos, solo
  // si cada premio trae descuento.
  wheel: null as PublicWheel | null,
};

export type PublicWheel = { enabled: boolean; title: string; subtitle: string; delaySeconds: number; prizes: { label: string; won: boolean }[] };
export type Tracking = { metaPixelId?: string; ga4Id?: string; googleAdsId?: string; tiktokPixelId?: string };
export type StoreInfo = typeof store;
export type CategoryInfo = { slug: CategorySlug; name: string; blurb: string; image: string };
export type LineInfo = { slug: Line; name: string; image: string };
export type Catalog = { store: StoreInfo; categories: CategoryInfo[]; lines: LineInfo[]; products: DemoProduct[] };

const categories: CategoryInfo[] = [
  { slug: "polerones", name: "Polerones", blurb: "Algodón perchado de 380 g, corte oversize.", image: "hoodie" },
  { slug: "poleras", name: "Poleras", blurb: "Boxy, manga larga y estampadas.", image: "tee" },
  { slug: "pantalones", name: "Pantalones", blurb: "Baggy, cargo y wide leg.", image: "cargo" },
  { slug: "chaquetas", name: "Chaquetas", blurb: "Cortavientos y mezclilla para el día a día.", image: "jacket" },
  { slug: "vestidos", name: "Vestidos", blurb: "Satinados, florales y para salir.", image: "dress" },
  { slug: "accesorios", name: "Accesorios", blurb: "Jockeys, bolsos y lo que completa el look.", image: "cap" },
];

const lines: LineInfo[] = [
  { slug: "mujer", name: "Mujer", image: "woman" },
  { slug: "hombre", name: "Hombre", image: "man" },
];

const SIZES = ["S", "M", "L", "XL"];
const C = {
  negro: { name: "Negro", hex: "#111111" },
  gris: { name: "Gris melange", hex: "#9a9a96" },
  burdeo: { name: "Burdeo", hex: "#6b1f2a" },
  blanco: { name: "Blanco", hex: "#f4f4f1" },
  beige: { name: "Beige", hex: "#d9c8ad" },
  verde: { name: "Verde oliva", hex: "#55593c" },
  azulClaro: { name: "Azul claro", hex: "#8fa9c4" },
  azul: { name: "Azul oscuro", hex: "#2b3a52" },
  rojo: { name: "Rojo", hex: "#c22a22" },
  champagne: { name: "Champagne", hex: "#e3cfae" },
  floral: { name: "Floral", hex: "#d98f9a" },
};

type Base = Omit<DemoProduct, "variants">;
const make = (p: Base): DemoProduct => ({
  ...p,
  variants: p.colors.flatMap((c, ci) =>
    p.sizes.map((s, si) => ({
      id: `${p.slug}-${ci}-${si}`,
      name: p.sizes.length > 1 ? `${c.name} / ${s}` : c.name,
      color: c.name,
      size: s,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.soldOut?.includes(s) ? 0 : p.badge === "ultimas" ? 2 : 12,
    })),
  ),
});

const base: Base[] = [
  {
    slug: "poleron-oversize-club",
    name: "Polerón Oversize Club",
    category: "polerones",
    line: "unisex",
    short: "Algodón perchado 380 g",
    description: "Nuestro polerón más vendido. Corte oversize, capucha doble y bordado frontal en hilo grueso. Lavado previo, así que no encoge.",
    details: ["80% algodón, 20% poliéster", "380 g/m²", "Bordado frontal", "Hecho en Santiago"],
    colors: [C.negro, C.gris, C.burdeo],
    sizes: SIZES,
    soldOut: ["S"],
    price: 44990,
    compareAtPrice: 54990,
    image: "hoodie",
    hover: "hoodie2",
    gallery: ["hoodie", "hoodie2", "streetwear", "man", "clothes"],
    colorPhotos: { Negro: ["hoodie2", "hoodie", "man", "streetwear"], "Gris melange": ["hoodie", "streetwear", "man2", "clothes"], Burdeo: ["knit", "hoodie", "street2", "clothes"] },
    featured: true,
  },
  {
    slug: "poleron-zip-logo",
    name: "Polerón Zip Logo 3D",
    category: "polerones",
    line: "unisex",
    short: "Doble cierre, logo en relieve",
    description: "Polerón con cierre doble y logo 3D en el pecho. Sale en el Drop 027; lo reservas hoy y lo despachamos el 25 de noviembre.",
    details: ["100% algodón", "420 g/m²", "Cierre doble YKK", "Despacho desde el 25/11"],
    colors: [C.negro, C.verde],
    sizes: SIZES,
    price: 49990,
    image: "hoodie2",
    hover: "hoodie",
    gallery: ["hoodie2", "hoodie", "man", "street2"],
    badge: "preventa",
    featured: true,
  },
  {
    slug: "polera-boxy-heavy",
    name: "Polera Boxy Heavy",
    category: "poleras",
    line: "unisex",
    short: "Corte cuadrado, 260 g",
    description: "Polera de algodón pesado, cuello grueso y corte boxy que cae recto. La básica que se ve cara.",
    details: ["100% algodón peinado", "260 g/m²", "Corte boxy", "Cuello reforzado"],
    colors: [C.blanco, C.negro, C.beige],
    sizes: SIZES,
    price: 19990,
    image: "tee",
    hover: "tee2",
    gallery: ["tee", "teeModel", "tee2", "tee4", "streetwear"],
    colorPhotos: { Blanco: ["tee", "teeModel", "tee4", "streetwear"], Negro: ["tee2", "tee3", "man2", "streetwear"], Beige: ["tee4", "tee", "clothes"] },
    featured: true,
  },
  {
    slug: "polera-manga-larga-special",
    name: "Polera Manga Larga Special",
    category: "poleras",
    line: "mujer",
    short: "Ajustada, con estampado en la espalda",
    description: "Manga larga de algodón con elasticidad, estampado serigrafiado en la espalda y puños largos.",
    details: ["95% algodón, 5% elastano", "Estampado serigrafía", "Calce ajustado"],
    colors: [C.negro, C.blanco],
    sizes: ["XS", "S", "M", "L"],
    price: 22990,
    compareAtPrice: 24990,
    image: "tee2",
    hover: "woman",
    gallery: ["tee2", "woman", "woman2", "portrait"],
  },
  {
    slug: "polera-estampada-norte",
    name: "Polera Estampada Norte",
    category: "poleras",
    line: "unisex",
    short: "Edición limitada, 150 unidades",
    description: "Estampado del Drop 026 en tinta al agua. Solo 150 unidades numeradas en la etiqueta.",
    details: ["100% algodón", "Tinta al agua", "150 unidades numeradas"],
    colors: [C.blanco],
    sizes: SIZES,
    price: 17990,
    image: "tee3",
    hover: "tee",
    gallery: ["tee3", "tee", "teeModel", "street2"],
    badge: "nuevo",
  },
  {
    slug: "pantalon-baggy-cargo",
    name: "Pantalón Baggy Cargo",
    category: "pantalones",
    line: "unisex",
    short: "Bolsillos laterales, pretina ajustable",
    description: "Cargo de gabardina con seis bolsillos, pierna ancha y cordón en la basta para ajustarlo sobre la zapatilla.",
    details: ["100% algodón gabardina", "6 bolsillos", "Basta con cordón"],
    colors: [C.gris, C.negro],
    sizes: ["38", "40", "42", "44"],
    soldOut: ["44"],
    price: 34990,
    compareAtPrice: 44990,
    image: "cargo",
    hover: "streetwear",
    gallery: ["cargo", "pants", "streetwear", "man2"],
    featured: true,
  },
  {
    slug: "jeans-wide-leg",
    name: "Jeans Wide Leg",
    category: "pantalones",
    line: "mujer",
    short: "Tiro alto, pierna ancha",
    description: "Jeans de tiro alto y pierna ancha en mezclilla rígida de 13 oz, que se amolda con el uso.",
    details: ["100% algodón", "Mezclilla 13 oz", "Tiro alto"],
    colors: [C.azulClaro, C.azul],
    sizes: ["36", "38", "40", "42"],
    price: 32990,
    image: "jeans",
    hover: "woman",
    gallery: ["jeans", "woman", "woman3", "shopping"],
  },
  {
    slug: "cortavientos-track",
    name: "Cortavientos Track",
    category: "chaquetas",
    line: "unisex",
    short: "Impermeable, con capucha guardable",
    description: "Cortavientos liviano con forro de malla, capucha que se guarda en el cuello y reflectante en la espalda.",
    details: ["100% poliéster", "Repele el agua", "Reflectante trasero"],
    colors: [C.negro, C.rojo],
    sizes: SIZES,
    price: 54990,
    image: "jacket",
    hover: "jacket2",
    gallery: ["jacket", "jacket2", "leather", "street2", "man"],
    badge: "nuevo",
    featured: true,
  },
  {
    slug: "chaqueta-mezclilla-oversize",
    name: "Chaqueta de Mezclilla Oversize",
    category: "chaquetas",
    line: "unisex",
    short: "Lavado vintage",
    description: "Chaqueta de mezclilla con lavado vintage, hombros caídos y botones metálicos grabados.",
    details: ["100% algodón", "Lavado vintage", "Botones grabados"],
    colors: [C.azulClaro],
    sizes: SIZES,
    price: 46990,
    compareAtPrice: 52990,
    image: "jacket2",
    hover: "jacket",
    gallery: ["jacket2", "jacket", "woman2", "street2"],
  },
  {
    slug: "vestido-midi-satinado",
    name: "Vestido Midi Satinado",
    category: "vestidos",
    line: "mujer",
    short: "Tiritas regulables, caída al bies",
    description: "Vestido midi de satín cortado al bies, con tiritas regulables y espalda descubierta.",
    details: ["100% poliéster satinado", "Largo midi", "Tiritas regulables"],
    colors: [C.negro, C.champagne],
    sizes: ["XS", "S", "M", "L"],
    price: 29990,
    image: "dress",
    hover: "dress2",
    gallery: ["dress", "dress3", "woman3", "portrait", "woman"],
    colorPhotos: { Negro: ["dress3", "dress", "portrait", "woman"], Champagne: ["dress", "woman3", "dress2", "woman2"] },
    featured: true,
  },
  {
    slug: "vestido-corto-floral",
    name: "Vestido Corto Floral",
    category: "vestidos",
    line: "mujer",
    short: "Manga globo, forrado",
    description: "Vestido corto forrado con estampado floral, manga globo y elástico en la espalda.",
    details: ["Viscosa", "Forrado", "Manga globo"],
    colors: [C.floral],
    sizes: ["S", "M", "L"],
    soldOut: ["S"],
    price: 24990,
    compareAtPrice: 29990,
    image: "dress2",
    hover: "dress",
    gallery: ["dress2", "dress", "woman2", "shopping"],
    badge: "ultimas",
  },
  {
    slug: "jockey-bordado",
    name: "Jockey Bordado",
    category: "accesorios",
    line: "unisex",
    short: "Visera curva, ajuste trasero",
    description: "Jockey de gabardina con logo bordado y hebilla metálica para ajustar atrás.",
    details: ["100% algodón", "Talla única", "Hebilla metálica"],
    colors: [C.negro, C.beige],
    sizes: ["Única"],
    price: 14990,
    image: "cap",
    hover: "streetwear",
    gallery: ["cap", "streetwear", "man", "sneakers"],
  },
  {
    slug: "bolso-tote",
    name: "Bolso Tote Canvas",
    category: "accesorios",
    line: "unisex",
    short: "Lona gruesa, bolsillo interior",
    description: "Tote de lona gruesa con bolsillo interior con cierre. Cabe un notebook de 15 pulgadas.",
    details: ["Lona 12 oz", "40 × 38 cm", "Bolsillo con cierre"],
    colors: [C.beige, C.negro],
    sizes: ["Única"],
    price: 12990,
    image: "bag",
    hover: "bag",
    gallery: ["bag", "handbag", "shopping", "woman"],
    badge: "nuevo",
  },
];

export const demoCatalog: Catalog = { store, categories, lines, products: base.map(make) };

export const photosFor = (p: DemoProduct, color?: string) =>
  (color && p.colorPhotos?.[color]) || p.gallery;

export const findProduct = (cat: Catalog, slug: string) => cat.products.find((p) => p.slug === slug);
export const categoryName = (cat: Catalog, slug: CategorySlug) => cat.categories.find((c) => c.slug === slug)?.name ?? slug;
export const fromPrice = (p: DemoProduct) => p.price;
export const discountPct = (p: DemoProduct) => (p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0);

export const badgeLabel = (p: DemoProduct): string | null => {
  if (p.badge === "preventa") return "Preventa";
  if (p.badge === "ultimas") return "Últimas unidades";
  if (p.compareAtPrice) return `−${discountPct(p)}%`;
  if (p.badge === "nuevo") return "Nuevo";
  return null;
};

export const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export const installment = (n: number, count: number) => formatCLP(Math.round(n / Math.max(1, count)));
