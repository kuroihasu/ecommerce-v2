import { adminApi } from "@/lib/admin/api";
import { adminOrigin } from "@/lib/admin/origin";
import type { AdminStore } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { MarketingForm } from "./MarketingForm";

export default async function MarketingPage() {
  const store = await adminApi<AdminStore>("");
  const origin = await adminOrigin();
  return (
    <AdminShell current="/admin/redes">
      <h1 className="mb-1 text-2xl font-semibold">Redes y publicidad</h1>
      <p className="mb-6 text-zinc-600">Tus redes sociales, los píxeles para medir tus anuncios y el catálogo para anunciar tus productos en Google, Facebook e Instagram.</p>
      <MarketingForm settings={store.settings} feedUrl={`${origin}/feeds/productos.xml`} />
    </AdminShell>
  );
}
