"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories, products, type CategorySlug } from "@/designs/catalog";
import { Card } from "../Card";

export function CatalogList() {
  const params = useSearchParams();
  const router = useRouter();
  const active = (params.get("c") as CategorySlug | null) ?? null;
  const cat = categories.find((c) => c.slug === active);
  const list = active ? products.filter((p) => p.category === active) : products;

  return (
    <>
      <div className="mb-10 flex flex-col gap-6 rounded-brand bg-field px-6 py-12 text-field-ink md:px-12">
        <h1 className="rise text-[clamp(3rem,7vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">{cat?.name ?? "Todo el catálogo"}</h1>
        <p className="max-w-xl text-xl">{cat?.blurb ?? "Doce piezas de diez talleres, de Putre a Chiloé."}</p>
        <div className="flex flex-wrap gap-2">
          {[{ slug: null, name: "Todo" }, ...categories].map((c) => (
            <button
              key={c.slug ?? "todo"}
              onClick={() => router.replace(c.slug ? `?c=${c.slug}` : "?", { scroll: false })}
              aria-pressed={active === c.slug}
              className={`h-12 rounded-full px-6 text-lg font-semibold transition-all active:scale-95 ${active === c.slug ? "bg-ink text-bg" : "bg-bg"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => <Card key={p.slug} p={p} />)}
      </div>
    </>
  );
}
