import { confirm, goTo, orderPath } from "../shared";

// Vuelta desde Webpay. Transbank puede volver con GET o POST y con token_ws (pago
// aprobado o rechazado), TBK_TOKEN (el cliente anuló) o solo TBK_ORDEN_COMPRA (se le
// acabó el tiempo). La API confirma con Transbank; aquí solo se reenvía.
async function handle(req: Request, form: URLSearchParams) {
  const url = new URL(req.url);
  const get = (k: string) => form.get(k) ?? url.searchParams.get(k) ?? undefined;
  const order = url.searchParams.get("o") ?? get("TBK_ORDEN_COMPRA");
  if (!order) return goTo(req, "/carrito");
  const r = await confirm("webpay/return", { order, token_ws: get("token_ws"), TBK_TOKEN: get("TBK_TOKEN") });
  return goTo(req, r ? orderPath(r) : "/carrito?pago=error");
}

export async function GET(req: Request) {
  return handle(req, new URLSearchParams());
}

export async function POST(req: Request) {
  const body = await req.text();
  return handle(req, new URLSearchParams(body.slice(0, 4000)));
}
