import { formatCLP, type StoreInfo } from "@/designs/catalog";

// Textos editables desde el panel (Avanzado). Si la tienda no escribió los suyos,
// cada diseño usa los de abajo. Los comodines se reemplazan con los datos al día,
// así cambiar el porcentaje del código destacado actualiza todos los avisos.
export type StoreTexts = { announce?: string[]; newsletterTitle?: string; newsletterThanks?: string };
type ThemeTexts = { announce: string[]; newsletterTitle: string; newsletterThanks: string };

export const placeholders = [
  { key: "{codigo}", label: "el código de descuento destacado" },
  { key: "{porcentaje}", label: "su porcentaje (10%) o «envío gratis»" },
  { key: "{descuento}", label: "«10% OFF» o «envío gratis»" },
  { key: "{minimo}", label: "la compra mínima del código" },
  { key: "{envio_gratis}", label: "el monto del envío gratis" },
  { key: "{cuotas}", label: "las cuotas sin interés" },
];

// La tienda todavía no envía correos: el código se muestra al suscribirse.
const thanks = "Listo, ya estás suscrito. Tu código de bienvenida es {codigo} ({porcentaje}).";

export const defaultTexts: Record<string, ThemeTexts> = {
  atelier: {
    announce: ["Envío gratis sobre {envio_gratis}", "{cuotas} cuotas sin interés con Mercado Pago", "{porcentaje} en tu primera compra con el código {codigo}"],
    newsletterTitle: "{porcentaje} en tu primera compra",
    newsletterThanks: thanks,
  },
  vitrina: {
    announce: ["Envíos a todo Chile", "{descuento} con el código {codigo}", "{cuotas} cuotas sin interés"],
    newsletterTitle: "Entra al club: {descuento}",
    newsletterThanks: thanks,
  },
  plaza: {
    announce: ["Envíos a todo Chile en 2 a 5 días", "Gratis sobre {envio_gratis}", "Código {codigo}: {porcentaje} en tu primera compra"],
    newsletterTitle: "Suscríbete y te regalamos {porcentaje} en tu primera compra.",
    newsletterThanks: thanks,
  },
  mercado: {
    announce: ["Envíos a todo Chile en 2 a 5 días", "Gratis sobre {envio_gratis}", "Código {codigo}: {porcentaje} en tu primera compra"],
    newsletterTitle: "Suscríbete y te regalamos {porcentaje} en tu primera compra.",
    newsletterThanks: thanks,
  },
};

// Si el código anunciado venció, la API ya lo manda vacío (ver catalog.service.ts).
export const hasDiscount = (store: Pick<StoreInfo, "discountCode" | "discountKind" | "discountPercent">) =>
  Boolean(store.discountCode && (store.discountKind === "FREE_SHIPPING" || store.discountPercent));
const needsDiscount = (t: string) => /\{(codigo|porcentaje|descuento|minimo)\}/.test(t);

export type TextData = Pick<StoreInfo, "discountCode" | "discountKind" | "discountPercent" | "discountMin" | "freeShippingFrom" | "installments">;

const free = (s: TextData) => s.discountKind === "FREE_SHIPPING";

export function fillText(t: string, store: TextData) {
  const out = t
    // "{porcentaje} OFF" en un código de envío gratis diría "envío gratis OFF".
    .replaceAll("{porcentaje} OFF", "{descuento}")
    .replaceAll("{codigo}", store.discountCode)
    .replaceAll("{descuento}", free(store) ? "envío gratis" : `${store.discountPercent}% OFF`)
    .replaceAll("{porcentaje}", free(store) ? "envío gratis" : `${store.discountPercent}%`)
    .replaceAll("{minimo}", formatCLP(store.discountMin ?? 0))
    .replaceAll("{envio_gratis}", formatCLP(store.freeShippingFrom))
    .replaceAll("{cuotas}", String(store.installments));
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Si el código pide una compra mínima, los avisos que lo nombran lo dicen solos.
export function withMinimum(t: string, store: TextData) {
  if (!((store.discountMin ?? 0) > 0 && needsDiscount(t) && !t.includes("{minimo}"))) return t;
  const dot = /[.!]$/.test(t.trim()) ? t.trim().slice(-1) : "";
  return `${dot ? t.trim().slice(0, -1) : t.trim()}, en compras desde {minimo}${dot}`;
}

// Textos listos para mostrar. Sin código destacado se omiten los avisos que lo
// nombran, y la suscripción vuelve a un título sin porcentaje.
export function storeTexts(store: StoreInfo, theme: string) {
  const d = defaultTexts[theme] ?? defaultTexts.atelier;
  const own = store.texts ?? {};
  const pick = (t: string | undefined, fallback: string, noDiscount: string) => {
    const chosen = t?.trim() || fallback;
    return fillText(!hasDiscount(store) && needsDiscount(chosen) ? noDiscount : chosen, store);
  };
  const announce = (own.announce?.length ? own.announce : d.announce).filter((t) => hasDiscount(store) || !needsDiscount(t)).map((t) => fillText(withMinimum(t, store), store));
  return {
    announce,
    newsletterTitle: pick(own.newsletterTitle, d.newsletterTitle, "Suscríbete y entérate primero de lo nuevo."),
    newsletterThanks: pick(withMinimum(own.newsletterThanks?.trim() || d.newsletterThanks, store), d.newsletterThanks, "Listo. Te escribiremos con las novedades."),
  };
}
