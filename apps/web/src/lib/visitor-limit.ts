import "server-only";
import { headers } from "next/headers";

// Límite de intentos por visitante (IP) para las acciones públicas de la tienda
// (códigos, ruleta, suscripción). Vive en memoria de cada instancia: es un freno
// contra quien prueba al azar, no una garantía.
const buckets = new Map<string, Map<string, { count: number; resetAt: number }>>();

export async function tooMany(bucket: string, limit: number, windowMs = 60_000) {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const hits = buckets.get(bucket) ?? new Map<string, { count: number; resetAt: number }>();
  buckets.set(bucket, hits);
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const e = hits.get(ip);
  if (!e || e.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  return ++e.count > limit;
}
