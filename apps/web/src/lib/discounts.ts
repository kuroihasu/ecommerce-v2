"use server";

import { demoCatalog } from "@/designs/catalog";
import { API_URL, apiHeaders } from "./api-base";
import { STORE_SLUG } from "./catalog";
import { tooMany } from "./visitor-limit";

export type DiscountCheck = { ok: true; code: string; percent: number } | { ok: false; error: string };

// El carrito pregunta si un código sirve. Solo consulta: el uso se descuenta al
// confirmar el pedido.
export async function checkDiscount(raw: string): Promise<DiscountCheck> {
  const code = String(raw ?? "").trim().toUpperCase().slice(0, 30);
  if (!code) return { ok: false, error: "Escribe un código." };
  // 20 intentos por minuto por visitante.
  if (await tooMany("discount", 20)) return { ok: false, error: "Demasiados intentos. Espera un minuto." };
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_SLUG}/discounts/check`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const d = (await res.json()) as { code: string; percent: number };
      return { ok: true, code: d.code, percent: d.percent };
    }
    if (res.status === 429) return { ok: false, error: "Demasiados intentos. Espera un minuto." };
    if (res.status === 404 || res.status === 400) return { ok: false, error: "Ese código no existe o ya no está disponible." };
    throw new Error(`API ${res.status}`);
  } catch {
    // En desarrollo sin API vale el código de la tienda de muestra. En producción no:
    // una tienda real no debe aceptar el código de la demo si su API se cae.
    const s = demoCatalog.store;
    if (process.env.NODE_ENV !== "production" && code === s.discountCode) return { ok: true, code, percent: s.discountPercent };
    return { ok: false, error: "No pudimos revisar el código. Intenta de nuevo." };
  }
}
