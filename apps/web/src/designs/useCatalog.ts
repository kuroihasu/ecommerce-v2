"use client";

import { useDeferredValue, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { type CategorySlug, type DemoProduct, type Line } from "./catalog";
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

// Sin tildes ni mayúsculas: "poleron" encuentra "Polerón".
export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Texto en el que se busca cada producto: nombre, categoría, colores, bajada,
// detalles, descripción y etiquetas.
function searchText(p: DemoProduct, categoryName: string) {
  return normalize(
    [p.name, categoryName, p.line, p.badge ?? "", p.short, ...p.colors.map((c) => c.name), ...p.details, p.description].join(" "),
  );
}

// Coincide si cada palabra buscada aparece en el texto del producto.
export function matches(text: string, query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every((w) => text.includes(w));
}

// Filtros del catálogo guardados en la URL (?q=texto&c=categoría&l=línea&t=talla&o=orden),
// así un filtro o una búsqueda se puede compartir por WhatsApp.
//
// Todo se filtra en el navegador sobre el catálogo que ya llegó con la página: buscar
// o cambiar un filtro no hace ninguna petición al servidor. La URL se actualiza con
// history.replaceState, que Next sincroniza con useSearchParams sin volver a renderizar
// la página en el servidor.
export function useCatalog() {
  const params = useSearchParams();
  const { products, categories } = useCatalogData();
  const q = params.get("q") ?? "";
  const c = params.get("c") as CategorySlug | null;
  const l = params.get("l") as Line | null;
  const t = params.get("t");
  const o = (params.get("o") as Sort | null) ?? "destacados";
  // Mientras se escribe, el filtrado queda en segundo plano y el campo no se traba.
  const query = useDeferredValue(q);

  // El índice de búsqueda se arma una vez por catálogo, no en cada tecla.
  const index = useMemo(
    () => new Map(products.map((p) => [p.slug, searchText(p, categories.find((x) => x.slug === p.category)?.name ?? "")])),
    [products, categories],
  );

  const list = useMemo(() => {
    let out = products.filter(
      (p) =>
        (!c || p.category === c) &&
        (!l || p.line === l || p.line === "unisex") &&
        (!t || (p.sizes.includes(t) && !p.soldOut?.includes(t))) &&
        (!query.trim() || matches(index.get(p.slug) ?? "", query)),
    );
    if (o === "menor") out = [...out].sort((a, b) => a.price - b.price);
    if (o === "mayor") out = [...out].sort((a, b) => b.price - a.price);
    if (o === "ofertas") out = [...out].sort((a, b) => Number(!!b.compareAtPrice) - Number(!!a.compareAtPrice));
    if (o === "nuevos") out = [...out].sort((a, b) => Number(b.badge === "nuevo" || b.badge === "preventa") - Number(a.badge === "nuevo" || a.badge === "preventa"));
    return out;
  }, [products, index, c, l, t, o, query]);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    const s = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  };

  return { list, q, c, l, t, o, set };
}
