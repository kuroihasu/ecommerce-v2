import { adminApi } from "@/lib/admin/api";
import type { AdminStore } from "@/lib/admin/types";
import { getThemeDef, themes } from "@/themes/registry";
import { layoutSections } from "@/themes/sections";
import { AdminShell } from "../AdminShell";
import { SectionsForm } from "./SectionsForm";
import { TextsForm } from "./TextsForm";
import { demoCatalog } from "@/designs/catalog";

export default async function AdvancedPage() {
  const store = await adminApi<AdminStore>("");
  const active = getThemeDef(store.theme?.template).id;
  return (
    <AdminShell current="/admin/avanzado">
      <h1 className="mb-1 text-2xl font-semibold">Avanzado</h1>
      <p className="mb-6 text-zinc-600">Ajustes para afinar la tienda. Si tienes dudas, déjalos como están.</p>
      <SectionsForm
        initialHidden={store.settings.hiddenSections ?? []}
        active={active}
        layout={layoutSections}
        designs={themes.map((t) => ({ id: t.id, name: t.name, sections: t.sections }))}
      />
      <TextsForm
        initial={store.settings.texts ?? {}}
        active={active}
        designs={themes.map((t) => ({ id: t.id, name: t.name }))}
        data={{
          discountCode: store.settings.discountCode ?? "",
          discountPercent: store.settings.discountPercent ?? 0,
          freeShippingFrom: store.settings.freeShippingFrom ?? demoCatalog.store.freeShippingFrom,
          installments: store.settings.installments ?? demoCatalog.store.installments,
        }}
      />
    </AdminShell>
  );
}
