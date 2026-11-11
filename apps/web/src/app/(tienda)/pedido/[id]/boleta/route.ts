import { cookies } from "next/headers";
import { STORE_SLUG } from "@/lib/catalog";
import { ORDER_KEY_COOKIE } from "@/lib/order-key";
import { proxyPdf } from "@/lib/receipt-pdf";

// PDF de la boleta para el comprador. La llave del pedido viaja en la cookie que
// guardó src/proxy.ts (su path, /pedido/<id>, también cubre esta dirección).
export async function GET(_: Request, { params }: RouteContext<"/pedido/[id]/boleta">) {
  const [{ id }, jar] = await Promise.all([params, cookies()]);
  const key = jar.get(ORDER_KEY_COOKIE)?.value ?? "";
  if (!key) return new Response("No encontramos la boleta.", { status: 404 });
  return proxyPdf(`/stores/${STORE_SLUG}/orders/${encodeURIComponent(id)}/receipt?k=${encodeURIComponent(key)}`);
}
