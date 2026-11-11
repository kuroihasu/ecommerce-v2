"use server";

import { headers } from "next/headers";
import { API_URL, apiHeaders } from "./api-base";
import { STORE_SLUG } from "./catalog";
import { tooMany } from "./visitor-limit";

// Checkout y pedidos: la web reenvía a la API, que calcula precios, crea el pedido y
// habla con Webpay o Mercado Pago. Las credenciales de las pasarelas nunca pasan por aquí.

export type Method = "webpay" | "mercadopago" | "transfer";
export type Methods = { webpay: boolean; mercadopago: boolean; transfer: boolean; test: boolean };
export type Redirect = { url: string; method: "GET" } | { url: string; method: "POST"; fields: Record<string, string> } | null;
export type Started = { ok: true; orderId: string; number: number; key: string; total: number; redirect: Redirect } | { ok: false; error: string };

export type CheckoutForm = {
  items: { variantId: string; qty: number }[];
  email: string;
  name: string;
  phone: string;
  rut?: string;
  address: { region: string; comuna: string; street: string; number: string; apartment?: string };
  notes?: string;
  code?: string;
  method: Method;
};

export type TransferDetails = { bank: string; accountType: string; accountNumber: string; holder: string; rut: string; email: string };
export type PublicOrder = {
  id: string;
  number: number;
  status: "PENDING" | "PAID" | "FULFILLED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  createdAt: string;
  email: string;
  items: { variantId: string | null; name: string; unitPrice: number; quantity: number }[];
  subtotal: number;
  discountTotal: number;
  discountCode: string | null;
  shippingTotal: number;
  total: number;
  address: { name?: string; line: string; comuna?: string; region?: string };
  payment: { method: Method; status: "PENDING" | "AUTHORIZED" | "FAILED" | "REFUNDED"; pending: boolean } | null;
  transfer: TransferDetails | null;
  methods: Methods | null;
};

const DOWN = "No pudimos conectar con la tienda. Intenta de nuevo en un rato.";
const BUSY = "Hay demasiados intentos desde tu conexión. Espera un minuto.";

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_SLUG}${path}`, {
      method: init?.method ?? "GET",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const data = (await res.json().catch(() => null)) as (T & { message?: string | string[] }) | null;
    if (res.ok && data) return { ok: true, data };
    if (res.status === 429) return { ok: false, error: BUSY, status: 429 };
    const m = data?.message;
    return { ok: false, error: res.status < 500 || res.status === 502 ? (Array.isArray(m) ? m.join(". ") : m) || DOWN : DOWN, status: res.status };
  } catch {
    return { ok: false, error: DOWN, status: 0 };
  }
}

// Dirección pública de esta tienda, para que la pasarela vuelva aquí.
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto.split(",")[0]}://${host}`;
}

export async function paymentMethods(): Promise<Methods> {
  const r = await api<Methods>("/payment-methods");
  return r.ok ? r.data : { webpay: false, mercadopago: false, transfer: false, test: false };
}

export async function startCheckout(form: CheckoutForm): Promise<Started> {
  if (await tooMany("checkout", 10)) return { ok: false, error: BUSY };
  const r = await api<Omit<Extract<Started, { ok: true }>, "ok">>("/checkout", { method: "POST", body: { ...form, origin: await origin() } });
  return r.ok ? { ok: true, ...r.data } : { ok: false, error: r.error };
}

export async function retryPayment(orderId: string, key: string, method: Method): Promise<Started> {
  if (await tooMany("checkout", 10)) return { ok: false, error: BUSY };
  const r = await api<Omit<Extract<Started, { ok: true }>, "ok">>(`/orders/${encodeURIComponent(orderId)}/pay`, { method: "POST", body: { key, method, origin: await origin() } });
  return r.ok ? { ok: true, ...r.data } : { ok: false, error: r.error };
}

export async function getOrder(orderId: string, key: string): Promise<PublicOrder | null> {
  const r = await api<PublicOrder>(`/orders/${encodeURIComponent(orderId)}?k=${encodeURIComponent(key)}`);
  return r.ok ? r.data : null;
}
