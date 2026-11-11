import { z } from 'zod';

// Lo que acepta el panel. Todo se valida aquí antes de tocar la base.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #rrggbb');
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones');
const text = (max: number) => z.string().trim().max(max);
const money = z.number().int().min(0).max(100_000_000);

export const ThemeInput = z.object({
  template: text(40).min(1),
  colors: z.partialRecord(z.enum(['bg', 'ink', 'surface', 'accent', 'field', 'field2']), hex).optional(),
  fonts: z.object({ display: text(40).optional(), body: text(40).optional() }).optional(),
  radius: z.number().min(0).max(40).optional(),
});

export const SettingsInput = z.object({
  tagline: text(160).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  instagram: text(60).optional(),
  tiktok: text(60).optional(),
  whatsapp: text(30).optional(),
  shippingRM: money.optional(),
  shippingRegions: money.optional(),
  freeShippingFrom: money.optional(),
  installments: z.number().int().min(1).max(48).optional(),
  nextDrop: z.object({ name: text(80).min(1), date: z.iso.datetime({ offset: true }) }).nullable().optional(),
  facebook: text(100).optional(),
  // Píxeles de publicidad. Cada id se valida con su formato para que la tienda nunca
  // inyecte algo que no sea un id en el <script> del píxel.
  tracking: z
    .object({
      metaPixelId: z.union([z.string().regex(/^\d{5,20}$/, 'El ID del píxel de Meta son solo números'), z.literal('')]).optional(),
      ga4Id: z.union([z.string().trim().toUpperCase().regex(/^G-[A-Z0-9]{4,15}$/, 'El ID de Google Analytics empieza con G-'), z.literal('')]).optional(),
      googleAdsId: z.union([z.string().trim().toUpperCase().regex(/^AW-\d{5,15}$/, 'El ID de Google Ads empieza con AW-'), z.literal('')]).optional(),
      tiktokPixelId: z.union([z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10,30}$/, 'El ID del píxel de TikTok son letras y números'), z.literal('')]).optional(),
    })
    .optional(),
  // Ids de secciones ocultas (ver apps/web/src/themes/sections.ts).
  hiddenSections: z.array(z.string().regex(/^[a-z][a-z0-9-]{0,39}$/)).max(50).optional(),
  // Textos propios de la barra de avisos y la suscripción (Avanzado). Vacío = el texto
  // del diseño. Admiten {codigo}, {porcentaje}, {envio_gratis} y {cuotas}.
  texts: z
    .object({
      announce: z.array(text(120).min(1)).max(5).optional(),
      newsletterTitle: text(120).optional(),
      newsletterThanks: text(160).optional(),
    })
    .optional(),
});

export const StoreInput = z.object({
  name: text(80).min(1).optional(),
  theme: ThemeInput.optional(),
  settings: SettingsInput.optional(),
});

export const ProductInput = z.object({
  name: text(120).min(1),
  slug,
  description: text(5000).nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().max(40).nullable().optional(),
  tags: z.array(text(30).toLowerCase().min(1)).max(20).optional(),
  attributes: z
    .object({
      short: text(160).optional(),
      details: z.array(text(200).min(1)).max(20).optional(),
      colors: z.array(z.object({ name: text(40).min(1), hex })).max(30).optional(),
    })
    .optional(),
});
export const ProductPatch = ProductInput.partial();

export const VariantsInput = z
  .array(
    z.object({
      id: z.string().max(40).optional(),
      name: text(120).min(1),
      sku: text(80).nullable().optional(),
      options: z.record(text(30).min(1), text(60)).default({}),
      price: money,
      compareAtPrice: money.nullable().optional(),
      stock: z.number().int().min(0).max(1_000_000),
    }),
  )
  .min(1, 'El producto necesita al menos una variante')
  .max(300);

export const ImagesInput = z
  .array(
    z.object({
      id: z.string().max(40).optional(),
      url: z.url({ protocol: /^https$/ }).max(2000),
      alt: text(200).nullable().optional(),
      color: text(40).nullable().optional(),
    }),
  )
  .max(60);

export const CategoryInput = z.object({
  name: text(80).min(1),
  slug,
  description: text(300).nullable().optional(),
  imageUrl: z.url({ protocol: /^https$/ }).max(2000).nullable().optional(),
  position: z.number().int().min(0).max(1000).optional(),
});
export const CategoryPatch = CategoryInput.partial();

export type StoreInput = z.infer<typeof StoreInput>;
export type ProductInput = z.infer<typeof ProductInput>;
export type ProductPatch = z.infer<typeof ProductPatch>;
export type VariantsInput = z.infer<typeof VariantsInput>;
export type ImagesInput = z.infer<typeof ImagesInput>;
export type CategoryInput = z.infer<typeof CategoryInput>;
export type CategoryPatch = z.infer<typeof CategoryPatch>;
