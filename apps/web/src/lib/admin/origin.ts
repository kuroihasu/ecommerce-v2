import "server-only";
import { headers } from "next/headers";

// Dirección pública del panel (https://mitienda.cl), para armar enlaces absolutos:
// el catálogo para anuncios y la vuelta del login de Meta y Google.
export async function adminOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
