"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminProduct } from "@/lib/admin/types";
import { normalize } from "@/designs/useCatalog";

const clp = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
export const statusLabel = { ACTIVE: "Publicado", DRAFT: "Borrador", ARCHIVED: "Archivado" } as const;
const statusClass = { ACTIVE: "bg-emerald-100 text-emerald-800", DRAFT: "bg-amber-100 text-amber-800", ARCHIVED: "bg-zinc-200 text-zinc-600" };

export function ProductTable({ products }: { products: AdminProduct[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | AdminProduct["status"]>("");
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const list = products.filter(
    (p) =>
      (!status || p.status === status) &&
      words.every((w) => normalize(`${p.name} ${p.category?.name ?? ""} ${p.slug}`).includes(w)),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 p-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o categoría" aria-label="Buscar productos" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Estado" className="h-10 rounded-lg border border-zinc-300 bg-white px-3">
          <option value="">Todos</option>
          <option value="ACTIVE">Publicados</option>
          <option value="DRAFT">Borradores</option>
          <option value="ARCHIVED">Archivados</option>
        </select>
      </div>
      <ul className="divide-y divide-zinc-100">
        {list.map((p) => {
          const prices = p.variants.map((v) => v.price);
          const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          return (
            <li key={p.id}>
              <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-4 px-3 py-3 hover:bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar a propósito */}
                {p.images[0] ? <img src={p.images[0].url} alt="" className="size-14 shrink-0 rounded-md bg-zinc-100 object-cover" loading="lazy" /> : <span className="size-14 shrink-0 rounded-md bg-zinc-100" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-zinc-500">{p.category?.name ?? "Sin categoría"} · {p.variants.length} variantes</span>
                </span>
                <span className="hidden w-36 text-right tabular-nums sm:block">{prices.length ? (min === max ? clp(min) : `${clp(min)} – ${clp(max)}`) : "—"}</span>
                <span className={`hidden w-20 text-right tabular-nums sm:block ${stock === 0 ? "text-red-600" : ""}`}>{stock} un.</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[p.status]}`}>{statusLabel[p.status]}</span>
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-3 py-10 text-center text-zinc-500">No hay productos que coincidan.</li>}
      </ul>
    </div>
  );
}
