"use client";

import { useState } from "react";
import { formatCLP, products } from "@/designs/catalog";
import { Card } from "./Card";

const budgets = [15000, 25000, 35000, 50000];

// Buscador por precio: lo "vivo" de la portada.
export function GiftFinder() {
  const [max, setMax] = useState(25000);
  const list = products.filter((p) => p.price <= max).sort((a, b) => b.price - a.price);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Presupuesto">
        {budgets.map((b) => (
          <button
            key={b}
            onClick={() => setMax(b)}
            aria-pressed={b === max}
            className={`h-12 rounded-full px-6 text-lg font-semibold transition-all active:scale-95 ${b === max ? "bg-ink text-bg" : "bg-bg hover:-translate-y-0.5"}`}
          >
            Hasta {formatCLP(b)}
          </button>
        ))}
      </div>
      <p className="text-xl" aria-live="polite">
        {list.length} {list.length === 1 ? "prenda" : "prendas"} hasta {formatCLP(max)}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
        {list.slice(0, 8).map((p, k) => (
          <div key={`${max}-${p.slug}`} className="rise" style={{ animationDelay: `${k * 50}ms` }}>
            <Card p={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
