// Datos compartidos del checkout. Los totales se muestran con la misma fórmula que usa la
// API (apps/api/src/orders/orders.service.ts → computeTotals), pero el cobro siempre lo
// calcula la API con los precios de la base.

export const REGIONS = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
] as const;

export type CodeInfo = { code: string; kind: "PERCENT" | "FREE_SHIPPING"; percent: number; minSubtotal: number };

export function computeTotals(
  subtotal: number,
  region: string,
  s: { shippingRM: number; shippingRegions: number; freeShippingFrom: number },
  code: CodeInfo | null,
) {
  const active = code && subtotal >= code.minSubtotal ? code : null;
  const discountTotal = active?.kind === "PERCENT" ? Math.round((subtotal * active.percent) / 100) : 0;
  const after = subtotal - discountTotal;
  const freeByCode = active?.kind === "FREE_SHIPPING";
  const baseShipping = after >= s.freeShippingFrom ? 0 : region === "Metropolitana" ? s.shippingRM : s.shippingRegions;
  const shippingTotal = freeByCode ? 0 : baseShipping;
  return { active, discountTotal, baseShipping, shippingTotal, freeByCode, total: after + shippingTotal };
}

export const METHOD_INFO = {
  webpay: { label: "Webpay", hint: "Tarjeta de crédito, débito o prepago. Te llevamos al sitio seguro de Transbank." },
  mercadopago: { label: "Mercado Pago", hint: "Tarjetas, saldo de Mercado Pago o cuotas. Pagas en el sitio de Mercado Pago." },
  transfer: { label: "Transferencia bancaria", hint: "Al confirmar te mostramos los datos de la cuenta. Despachamos cuando llegue el depósito." },
} as const;
