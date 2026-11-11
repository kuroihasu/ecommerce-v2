"use server";

import { API_URL, apiHeaders } from "./api-base";
import { STORE_SLUG } from "./catalog";
import { tooMany } from "./visitor-limit";

// Acciones públicas de la ruleta de regalos y la suscripción a novedades.
// El servidor de la API sortea y firma el premio; aquí solo se reenvía.

type Fail = { ok: false; error: string };
export type SpinResult = { ok: true; index: number; label: string; won: boolean; minSubtotal: number; token: string } | Fail;
export type ClaimResult = { ok: true; code: string | null; kind: "PERCENT" | "FREE_SHIPPING" | null; percent: number | null; minSubtotal: number; repeated: boolean } | Fail;

const BUSY = "Hay demasiados intentos desde tu conexión. Espera un minuto.";
const DOWN = "No pudimos conectar con la tienda. Intenta de nuevo en un rato.";

async function post<T>(path: string, body?: unknown): Promise<{ ok: true; data: T } | Fail> {
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_SLUG}${path}`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as (T & { message?: string | string[] }) | null;
    if (res.ok && data) return { ok: true, data };
    if (res.status === 429) return { ok: false, error: BUSY };
    const m = data?.message;
    return { ok: false, error: res.status < 500 && m ? (Array.isArray(m) ? m.join(". ") : m) : DOWN };
  } catch {
    return { ok: false, error: DOWN };
  }
}

const cleanEmail = (raw: string) => String(raw ?? "").trim().toLowerCase().slice(0, 254);

export async function spinWheel(): Promise<SpinResult> {
  if (await tooMany("wheel-spin", 10)) return { ok: false, error: BUSY };
  const r = await post<{ index: number; label: string; won: boolean; minSubtotal?: number; token: string }>("/wheel/spin");
  return r.ok ? { ok: true, ...r.data, minSubtotal: r.data.minSubtotal ?? 0 } : r;
}

export async function claimWheel(email: string, token: string): Promise<ClaimResult> {
  if (await tooMany("wheel-claim", 10)) return { ok: false, error: BUSY };
  const r = await post<{ code: string | null; kind?: "PERCENT" | "FREE_SHIPPING" | null; percent: number | null; minSubtotal?: number; repeated: boolean }>("/wheel/claim", { email: cleanEmail(email), token: String(token ?? "").slice(0, 600) });
  return r.ok ? { ok: true, ...r.data, kind: r.data.kind ?? (r.data.code ? "PERCENT" : null), minSubtotal: r.data.minSubtotal ?? 0 } : r;
}

export async function subscribe(email: string): Promise<{ ok: true } | Fail> {
  if (await tooMany("subscribe", 10)) return { ok: false, error: BUSY };
  const r = await post<{ ok: boolean }>("/subscribers", { email: cleanEmail(email) });
  return r.ok ? { ok: true } : r;
}
