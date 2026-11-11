import { redirect } from "next/navigation";
import { STORE_SLUG } from "@/lib/catalog";
import { getToken } from "@/lib/admin/session";
import { proxyPdf } from "@/lib/receipt-pdf";

// PDF de una boleta desde el panel (con la sesión del panel).
export async function GET(_: Request, { params }: RouteContext<"/admin/boletas/[id]/pdf">) {
  const { id } = await params;
  const token = await getToken();
  if (!token) redirect("/admin/login");
  return proxyPdf(`/admin/stores/${STORE_SLUG}/receipts/${encodeURIComponent(id)}/pdf`, { authorization: `Bearer ${token}` });
}
