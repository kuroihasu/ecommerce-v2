import { headers } from "next/headers";
import { adminApi } from "@/lib/admin/api";
import type { AdminStore } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { MarketingForm } from "./MarketingForm";

export default async function MarketingPage() {
  const store = await adminApi<AdminStore>("");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <AdminShell current="/admin/redes">
      <h1 className="mb-1 text-2xl font-semibold">Redes y publicidad</h1>
      <p className="mb-6 text-zinc-600">Tus redes sociales, los píxeles para medir tus anuncios y el catálogo para anunciar tus productos en Google, Facebook e Instagram.</p>
      <MarketingForm settings={store.settings} feedUrl={`${proto}://${host}/feeds/productos.xml`} />
    </AdminShell>
  );
}
