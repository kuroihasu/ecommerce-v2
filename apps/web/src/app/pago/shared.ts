import "server-only";
import { API_URL, apiHeaders } from "@/lib/api-base";
import { STORE_SLUG } from "@/lib/catalog";

// La pasarela devuelve al cliente a esta tienda; aquí se le pide a la API que confirme
// el pago (ella habla con Webpay o Mercado Pago) y se lleva al cliente a su pedido.
export async function confirm(path: string, body: Record<string, string | undefined>): Promise<{ orderId: string; key: string } | null> {
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_SLUG}/payments/${path}`, {
      method: "POST",
      headers: apiHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    return res.ok ? ((await res.json()) as { orderId: string; key: string }) : null;
  } catch {
    return null;
  }
}

// 303: el navegador sigue con GET aunque Webpay haya vuelto con POST.
export const goTo = (req: Request, path: string) => Response.redirect(new URL(path, req.url), 303);

export const orderPath = (r: { orderId: string; key: string }) => `/pedido/${encodeURIComponent(r.orderId)}?k=${encodeURIComponent(r.key)}`;
