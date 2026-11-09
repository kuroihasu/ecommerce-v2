"use client";

import { categories, categoryName } from "@/designs/catalog";
import { allSizes, sortLabels, useCatalog, type Sort } from "@/designs/useCatalog";
import { Card } from "../Card";

export function CatalogView() {
  const { list, c, l, t, o, set } = useCatalog();
  const title = c ? categoryName(c) : l === "mujer" ? "Mujer" : l === "hombre" ? "Hombre" : o === "ofertas" ? "Ofertas" : o === "nuevos" ? "Lo nuevo" : "Toda la colección";
  const chip = (on: boolean) => `h-11 px-4 text-base transition-colors ${on ? "bg-ink text-bg" : "bg-surface hover:bg-ink/10"}`;

  return (
    <>
      <div className="flex flex-col gap-6 pt-12 pb-10">
        <h1 className="rise font-display text-[clamp(3.5rem,7vw,7rem)] leading-[0.92] tracking-[-0.03em]">{title}</h1>
        <div className="rise rise-1 flex flex-wrap gap-2">
          <button className={chip(!c)} onClick={() => set("c", null)}>Todo</button>
          {categories.map((x) => (
            <button key={x.slug} className={chip(c === x.slug)} onClick={() => set("c", x.slug)}>{x.name}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-8 lg:sticky lg:top-28 lg:h-fit">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-lg">Para</legend>
            <div className="flex flex-wrap gap-2">
              {[null, "mujer", "hombre"].map((x) => (
                <button key={x ?? "todos"} className={chip(l === x)} onClick={() => set("l", x)}>{x === null ? "Todos" : x === "mujer" ? "Mujer" : "Hombre"}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-lg">Talla</legend>
            <div className="flex flex-wrap gap-2">
              {allSizes.map((s) => (
                <button key={s} className={`${chip(t === s)} min-w-12`} onClick={() => set("t", t === s ? null : s)}>{s}</button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-3 text-lg">
            Ordenar
            <select value={o} onChange={(e) => set("o", e.target.value as Sort)} className="h-12 bg-surface px-3 text-base">
              {Object.entries(sortLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </aside>
        <div>
          <p className="mb-6 text-base">{list.length} productos</p>
          {list.length === 0 ? (
            <p className="text-xl">No hay prendas con esos filtros. Prueba con otra talla.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 xl:grid-cols-3">
              {list.map((p) => <Card key={p.slug} p={p} sizes="(max-width: 1024px) 50vw, 30vw" />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
