import { adminApi } from "@/lib/admin/api";
import type { AdminDiscount, AdminStore, Subscriber, WheelConfig } from "@/lib/admin/types";
import { getThemeDef } from "@/themes/registry";
import { mergeTokens, readableOn } from "@/themes/tokens";
import { AdminShell } from "../AdminShell";
import { WheelForm } from "./WheelForm";
import { SubscriberList } from "./SubscriberList";

// Ruleta por defecto: los códigos activos (hasta 4) y un "Sigue participando".
function starter(codes: AdminDiscount[]): WheelConfig {
  const live = codes.filter((c) => c.active).slice(0, 4);
  const prizes = live.map((c) => ({ label: `${c.percent}% OFF`, code: c.code, weight: 25 }));
  prizes.push({ label: "Sigue participando", code: "", weight: 10 });
  if (prizes.length < 2) prizes.push({ label: "Sorpresa", code: "", weight: 10 });
  return { enabled: false, title: "Gira y gana", subtitle: "Prueba tu suerte y llévate un descuento para tu compra.", delaySeconds: 8, prizes };
}

export default async function WheelPage() {
  const [store, codes, subs] = await Promise.all([
    adminApi<AdminStore>(""),
    adminApi<AdminDiscount[]>("/discounts"),
    adminApi<{ total: number; items: Subscriber[] }>("/subscribers"),
  ]);
  const tokens = mergeTokens(getThemeDef(store.theme?.template).defaults, store.theme);
  const c = tokens.colors;
  const palette = [c.accent, c.field, c.surface, c.field2].map((fill) => ({ fill, ink: readableOn(fill) }));
  return (
    <AdminShell current="/admin/ruleta">
      <h1 className="mb-1 text-2xl font-semibold">Ruleta de regalos</h1>
      <p className="mb-6 text-zinc-600">
        Una ventana en la tienda donde el cliente gira una ruleta, ve su premio y deja su correo para recibir el código. Así sumas suscriptores para tus novedades.
      </p>
      <WheelForm initial={store.settings.wheel ?? starter(codes)} codes={codes} palette={palette} />
      <SubscriberList total={subs.total} items={subs.items} storeName={store.name} />
    </AdminShell>
  );
}
