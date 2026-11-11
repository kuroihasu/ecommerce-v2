import { formatCLP, type StoreInfo } from "@/designs/catalog";

// Textos editables desde el panel (Avanzado). Si la tienda no escribió los suyos,
// cada diseño usa los de abajo. Los comodines se reemplazan con los datos al día,
// así cambiar el porcentaje del código destacado actualiza todos los avisos.
export type StoreTexts = { announce?: string[]; newsletterTitle?: string; newsletterThanks?: string };
type ThemeTexts = { announce: string[]; newsletterTitle: string; newsletterThanks: string };

export const placeholders = [
  { key: "{codigo}", label: "el código de descuento destacado" },
  { key: "{porcentaje}", label: "su porcentaje, por ejemplo 10%" },
  { key: "{envio_gratis}", label: "el monto del envío gratis" },
  { key: "{cuotas}", label: "las cuotas sin interés" },
];

const thanks = "Listo. Revisa tu correo: ahí va tu código de {porcentaje}.";

export const defaultTexts: Record<string, ThemeTexts> = {
  atelier: {
    announce: ["Envío gratis sobre {envio_gratis}", "{cuotas} cuotas sin interés con Mercado Pago", "{porcentaje} en tu primera compra con el código {codigo}"],
    newsletterTitle: "{porcentaje} en tu primera compra",
    newsletterThanks: thanks,
  },
  vitrina: {
    announce: ["Envíos a todo Chile", "{porcentaje} OFF con el código {codigo}", "{cuotas} cuotas sin interés"],
    newsletterTitle: "Entra al club: {porcentaje} OFF",
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

const hasDiscount = (store: StoreInfo) =>
  Boolean(store.discountCode && store.discountPercent) && !(store.discountExpiresAt && new Date(store.discountExpiresAt) <= new Date());
const needsDiscount = (t: string) => t.includes("{codigo}") || t.includes("{porcentaje}");

export type TextData = Pick<StoreInfo, "discountCode" | "discountPercent" | "freeShippingFrom" | "installments">;

export function fillText(t: string, store: TextData) {
  return t
    .replaceAll("{codigo}", store.discountCode)
    .replaceAll("{porcentaje}", `${store.discountPercent}%`)
    .replaceAll("{envio_gratis}", formatCLP(store.freeShippingFrom))
    .replaceAll("{cuotas}", String(store.installments));
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
  const announce = (own.announce?.length ? own.announce : d.announce).filter((t) => hasDiscount(store) || !needsDiscount(t)).map((t) => fillText(t, store));
  return {
    announce,
    newsletterTitle: pick(own.newsletterTitle, d.newsletterTitle, "Suscríbete y entérate primero de lo nuevo."),
    newsletterThanks: pick(own.newsletterThanks, d.newsletterThanks, "Listo. Te escribiremos con las novedades."),
  };
}
