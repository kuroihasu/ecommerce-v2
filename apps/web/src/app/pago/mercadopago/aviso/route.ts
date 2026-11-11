import { confirm } from "../../shared";

// Aviso automático de Mercado Pago (webhook). Llega con ?type=payment&data.id=… o en el
// cuerpo { type, data: { id } } (o el formato antiguo topic=payment&id=…). Solo se usa
// el id: la API consulta el pago a Mercado Pago con el token de la tienda.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const order = url.searchParams.get("o");
  const body = (await req.json().catch(() => null)) as { type?: string; action?: string; data?: { id?: string | number } } | null;
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body?.type ?? "";
  const id = String(url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body?.data?.id ?? "");
  if (!order || type !== "payment" || !/^\d{1,20}$/.test(id)) return Response.json({ ok: true });
  // Si la API no pudo revisarlo, un error hace que Mercado Pago vuelva a avisar más tarde.
  const r = await confirm("mercadopago/notice", { order, paymentId: id });
  return r ? Response.json({ ok: true }) : Response.json({ ok: false }, { status: 502 });
}
