import { confirm, goTo, orderPath } from "../shared";

// Vuelta desde Mercado Pago (pago aprobado, pendiente o rechazado). La API consulta el
// pago a Mercado Pago antes de marcar nada.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const order = url.searchParams.get("o") ?? url.searchParams.get("external_reference");
  if (!order) return goTo(req, "/carrito");
  const id = url.searchParams.get("payment_id") ?? url.searchParams.get("collection_id");
  const r = await confirm("mercadopago/return", { order, paymentId: id && /^\d{1,20}$/.test(id) ? id : undefined });
  return goTo(req, r ? orderPath(r) : "/carrito?pago=error");
}
