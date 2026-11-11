import { adminApi } from "@/lib/admin/api";
import type { AdminCategory, AdminProduct, AdminStore } from "@/lib/admin/types";
import { getThemeDef, themes } from "@/themes/registry";
import { layoutSections } from "@/themes/sections";
import { AdminShell } from "../AdminShell";
import { SectionsForm } from "./SectionsForm";
import { TextsForm } from "./TextsForm";
import { HeroForm } from "./HeroForm";
import { demoCatalog } from "@/designs/catalog";

export default async function AdvancedPage() {
  const [store, products, categories] = await Promise.all([
    adminApi<AdminStore>(""),
    adminApi<AdminProduct[]>("/products"),
    adminApi<AdminCategory[]>("/categories"),
  ]);
  const live = products.filter((p) => p.status === "ACTIVE");
  // Fotos para elegir en el carrusel: las de categorías y la primera de cada producto.
  const photos = [
    ...categories.flatMap((c) => (c.imageUrl ? [{ url: c.imageUrl, label: c.name }] : [])),
    ...live.flatMap((p) => p.images.slice(0, 2).map((img) => ({ url: img.url, label: p.name }))),
  ].filter((p, i, all) => /^https:\/\//.test(p.url) && all.findIndex((q) => q.url === p.url) === i).slice(0, 60);
  const links = [
    { href: "/catalogo", label: "Todo el catálogo" },
    { href: "/catalogo?o=nuevos", label: "Lo nuevo" },
    { href: "/catalogo?o=ofertas", label: "Ofertas" },
    ...categories.map((c) => ({ href: `/catalogo?c=${c.slug}`, label: `Categoría: ${c.name}` })),
    ...live.map((p) => ({ href: `/producto/${p.slug}`, label: `Producto: ${p.name}` })),
  ];
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
      <HeroForm initial={store.settings.hero ?? {}} active={active} photos={photos} links={links} />
      <TextsForm
        initial={store.settings.texts ?? {}}
        active={active}
        designs={themes.map((t) => ({ id: t.id, name: t.name }))}
        data={{
          discountCode: store.settings.discountCode ?? "",
          discountKind: store.settings.discountKind ?? "PERCENT",
          discountPercent: store.settings.discountPercent ?? 0,
          discountMin: store.settings.discountMin ?? 0,
          freeShippingFrom: store.settings.freeShippingFrom ?? demoCatalog.store.freeShippingFrom,
          installments: store.settings.installments ?? demoCatalog.store.installments,
        }}
      />
    </AdminShell>
  );
}
