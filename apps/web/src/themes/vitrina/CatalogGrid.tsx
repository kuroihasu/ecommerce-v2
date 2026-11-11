"use client";

import { categoryName } from "@/designs/catalog";
import { useCatalogData } from "@/designs/CatalogProvider";
import { SearchBox } from "@/designs/SearchBox";
import { allSizes, sortLabels, useCatalog, type Sort } from "@/designs/useCatalog";
import { ProductTile } from "./ProductTile";

export function CatalogGrid() {
  const catalog = useCatalogData();
  const { categories } = catalog;
  const { list, q, c, l, t, o, set } = useCatalog();
  const title = q.trim() ? `“${q.trim()}”` : c ? categoryName(catalog, c) : l === "mujer" ? "Girls" : l === "hombre" ? "Men" : o === "ofertas" ? "Sale" : o === "nuevos" ? "New in" : "Tienda";
  const chip = (on: boolean) => `h-11 px-4 text-base font-semibold uppercase transition-colors ${on ? "bg-ink text-bg" : "bg-surface hover:bg-accent hover:text-accent-ink"}`;

  return (
    <>
      <h1 className="rise pt-4 pb-6 text-[clamp(3.6rem,12vw,12rem)] font-black uppercase leading-[0.82] tracking-[-0.025em] [font-stretch:62%] [word-spacing:0.08em]">{title}</h1>
      <div className="z-20 md:sticky md:top-[76px] -mx-4 mb-3 flex flex-col gap-2 bg-bg px-4 py-3 sm:-mx-6 sm:px-6">
        <SearchBox value={q} onChange={(v) => set("q", v)} className="max-w-xl" inputClass="bg-surface font-semibold" />
        <div className="flex flex-wrap items-center gap-2">
          <button className={chip(!c)} onClick={() => set("c", null)}>Todo</button>
          {categories.map((x) => <button key={x.slug} className={chip(c === x.slug)} onClick={() => set("c", x.slug)}>{x.name}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[null, "mujer", "hombre"].map((x) => (
            <button key={x ?? "all"} className={chip(l === x)} onClick={() => set("l", x)}>{x === null ? "Todos" : x === "mujer" ? "Girls" : "Men"}</button>
          ))}
          <select aria-label="Talla" value={t ?? ""} onChange={(e) => set("t", e.target.value || null)} className="h-11 bg-surface px-3 text-base font-semibold">
            <option value="">Talla</option>
            {allSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Ordenar" value={o} onChange={(e) => set("o", e.target.value as Sort)} className="h-11 bg-surface px-3 text-base font-semibold">
            {Object.entries(sortLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="ml-auto text-base font-semibold">{list.length} productos</span>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="py-10 text-2xl">{q.trim() ? "Nada con esa búsqueda. Prueba otra palabra." : "Nada con esos filtros. Prueba otra talla."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <ProductTile key={p.slug} p={p} />)}
        </div>
      )}
    </>
  );
}
