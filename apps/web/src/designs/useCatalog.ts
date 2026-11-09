"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type CategorySlug, type Line } from "./catalog";
import { useCatalogData } from "./CatalogProvider";

export type Sort = "destacados" | "nuevos" | "menor" | "mayor" | "ofertas";
export const sortLabels: Record<Sort, string> = {
  destacados: "Destacados",
  nuevos: "Lo nuevo",
  ofertas: "Ofertas primero",
  menor: "Menor precio",
  mayor: "Mayor precio",
};
export const allSizes = ["XS", "S", "M", "L", "XL", "36", "38", "40", "42", "44"];

// Filtros del catálogo guardados en la URL (?c=categoría&l=línea&t=talla&o=orden),
// así un filtro se puede compartir por WhatsApp.
export function useCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const { products } = useCatalogData();
  const c = params.get("c") as CategorySlug | null;
  const l = params.get("l") as Line | null;
  const t = params.get("t");
  const o = (params.get("o") as Sort | null) ?? "destacados";

  let list = products.filter(
    (p) =>
      (!c || p.category === c) &&
      (!l || p.line === l || p.line === "unisex") &&
      (!t || (p.sizes.includes(t) && !p.soldOut?.includes(t))),
  );
  if (o === "menor") list = [...list].sort((a, b) => a.price - b.price);
  if (o === "mayor") list = [...list].sort((a, b) => b.price - a.price);
  if (o === "ofertas") list = [...list].sort((a, b) => Number(!!b.compareAtPrice) - Number(!!a.compareAtPrice));
  if (o === "nuevos") list = [...list].sort((a, b) => Number(b.badge === "nuevo" || b.badge === "preventa") - Number(a.badge === "nuevo" || a.badge === "preventa"));

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const q = next.toString();
    router.replace(q ? `?${q}` : "?", { scroll: false });
  };

  return { list, c, l, t, o, set };
}
