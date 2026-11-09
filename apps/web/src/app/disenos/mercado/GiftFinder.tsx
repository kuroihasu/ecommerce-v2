"use client";

import { useState } from "react";
import { formatCLP, fromPrice, products } from "@/designs/catalog";
import { Card } from "./Card";

const budgets = [10000, 15000, 25000, 50000, 70000];

// Buscador de regalos por presupuesto: lo único "vivo" de la portada.
export function GiftFinder() {
  const [max, setMax] = useState(25000);
  const list = products.filter((p) => fromPrice(p) <= max).sort((a, b) => fromPrice(b) - fromPrice(a));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Presupuesto">
        {budgets.map((b) => (
          <button
            key={b}
            onClick={() => setMax(b)}
            aria-pressed={b === max}
            className={`h-12 rounded-full px-6 text-lg font-semibold transition-all active:scale-95 ${b === max ? "bg-ink text-bg" : "bg-bg hover:bg-white/70"}`}
          >
            Hasta {formatCLP(b)}
          </button>
        ))}
      </div>
      <p className="text-xl" aria-live="polite">
        {list.length} {list.length === 1 ? "idea" : "ideas"} de regalo hasta {formatCLP(max)}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
        {list.slice(0, 8).map((p) => <Card key={p.slug} p={p} />)}
      </div>
    </div>
  );
}
