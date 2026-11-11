"use client";

import { categoryName } from "@/designs/catalog";
import { useCatalogData } from "@/designs/CatalogProvider";
import { SearchBox } from "@/designs/SearchBox";
import { allSizes, sortLabels, useCatalog, type Sort } from "@/designs/useCatalog";
import { Card } from "./Card";

export function CatalogList() {
  const catalog = useCatalogData();
  const { categories } = catalog;
  const { list, q, c, l, t, o, set } = useCatalog();
  const cat = categories.find((x) => x.slug === c);
  const title = q.trim() ? `“${q.trim()}”` : c ? categoryName(catalog, c) : l === "mujer" ? "Mujer" : l === "hombre" ? "Hombre" : o === "ofertas" ? "Ofertas" : o === "nuevos" ? "Lo nuevo" : "Todos los productos";
  const pill = (on: boolean) => `h-12 rounded-full px-5 text-base font-semibold transition-all active:scale-95 ${on ? "bg-ink text-bg" : "bg-bg hover:-translate-y-0.5"}`;

  return (
    <>
      <div className="mb-6 flex flex-col gap-6 rounded-brand bg-field px-6 py-12 text-field-ink md:px-12">
        <h1 className="rise text-[clamp(3rem,7vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">{title}</h1>
        <p className="max-w-xl text-xl">{cat?.blurb ?? "Ropa y accesorios con envío a todo Chile."}</p>
        <SearchBox value={q} onChange={(v) => set("q", v)} className="max-w-xl" inputClass="rounded-full bg-bg text-ink" />
        <div className="flex flex-wrap gap-2">
          <button className={pill(!c)} onClick={() => set("c", null)}>Todo</button>
          {categories.map((x) => <button key={x.slug} className={pill(c === x.slug)} onClick={() => set("c", x.slug)}>{x.name}</button>)}
        </div>
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {[null, "mujer", "hombre"].map((x) => (
          <button key={x ?? "all"} className={`h-11 rounded-full px-5 text-base font-medium ${l === x ? "bg-accent text-accent-ink" : "bg-surface"}`} onClick={() => set("l", x)}>
            {x === null ? "Todos" : x === "mujer" ? "Mujer" : "Hombre"}
          </button>
        ))}
        <select aria-label="Talla" value={t ?? ""} onChange={(e) => set("t", e.target.value || null)} className="h-11 rounded-full bg-surface px-4 text-base">
          <option value="">Todas las tallas</option>
          {allSizes.map((s) => <option key={s} value={s}>Talla {s}</option>)}
        </select>
        <select aria-label="Ordenar" value={o} onChange={(e) => set("o", e.target.value as Sort)} className="h-11 rounded-full bg-surface px-4 text-base">
          {Object.entries(sortLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="ml-auto text-base">{list.length} productos</span>
      </div>
      {list.length === 0 ? (
        <p className="text-2xl">{q.trim() ? "No encontramos prendas con esa búsqueda." : "No encontramos prendas con esos filtros."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <Card key={p.slug} p={p} />)}
        </div>
      )}
    </>
  );
}
