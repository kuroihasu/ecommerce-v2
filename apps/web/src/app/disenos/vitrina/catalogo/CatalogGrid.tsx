"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { categories, fromPrice, products, type CategorySlug } from "@/designs/catalog";
import { ProductTile } from "../ProductTile";

type Sort = "destacados" | "menor" | "mayor";

export function CatalogGrid() {
  const params = useSearchParams();
  const router = useRouter();
  const active = (params.get("c") as CategorySlug | null) ?? null;
  const [sort, setSort] = useState<Sort>("destacados");

  let list = active ? products.filter((p) => p.category === active) : products;
  if (sort !== "destacados") list = [...list].sort((a, b) => (sort === "menor" ? 1 : -1) * (fromPrice(a) - fromPrice(b)));

  const go = (c: string | null) => router.replace(c ? `?c=${c}` : "?", { scroll: false });

  return (
    <>
      <div className="sticky top-[76px] z-10 -mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 bg-bg px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {[{ slug: null, name: "Todo" }, ...categories].map((c) => (
            <button
              key={c.slug ?? "todo"}
              onClick={() => go(c.slug)}
              aria-pressed={active === c.slug}
              className={`h-11 px-5 text-base font-semibold transition-colors ${active === c.slug ? "bg-ink text-bg" : "bg-surface hover:bg-accent hover:text-accent-ink"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-base font-semibold">
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 bg-surface px-3">
            <option value="destacados">Destacados</option>
            <option value="menor">Menor precio</option>
            <option value="mayor">Mayor precio</option>
          </select>
        </label>
      </div>
      <p className="mb-3 text-base">{list.length} productos</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => <ProductTile key={p.slug} p={p} />)}
      </div>
    </>
  );
}
