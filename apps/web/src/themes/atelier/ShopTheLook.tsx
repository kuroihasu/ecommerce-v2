"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCLP, getProduct } from "@/designs/catalog";
import { useCart } from "@/designs/cart";
import { Photo } from "@/designs/Photo";

// Lista de prendas del look con casillas: suma el total y agrega todo en la talla elegida.
export function ShopTheLook({ slugs }: { slugs: string[] }) {
  const items = slugs.map((s) => getProduct(s)!);
  const cart = useCart("tienda");
  const [picked, setPicked] = useState<string[]>(slugs);
  const [size, setSize] = useState("M");
  const [done, setDone] = useState(false);
  const total = items.filter((p) => picked.includes(p.slug)).reduce((s, p) => s + p.price, 0);

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {items.map((p) => {
          const on = picked.includes(p.slug);
          return (
            <li key={p.slug}>
              <label className={`flex cursor-pointer items-center gap-4 p-2 transition-colors ${on ? "bg-bg" : "bg-transparent opacity-60"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setPicked((x) => (on ? x.filter((s) => s !== p.slug) : [...x, p.slug]))}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
                <Photo name={p.image} alt="" sizes="64px" className="aspect-[3/4] w-16 shrink-0" />
                <span className="flex flex-1 flex-col">
                  <Link href={`/producto/${p.slug}`} className="text-lg hover:underline">{p.name}</Link>
                  <span className="text-base text-ink/70">{p.colors[0].name}</span>
                </span>
                <span className="text-lg tabular-nums">{formatCLP(p.price)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-base">Talla</span>
        {["S", "M", "L", "XL"].map((s) => (
          <button key={s} type="button" aria-pressed={s === size} onClick={() => setSize(s)} className={`h-11 min-w-12 px-3 text-base transition-colors ${s === size ? "bg-ink text-bg" : "bg-bg"}`}>
            {s}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={picked.length === 0}
        onClick={() => {
          items
            .filter((p) => picked.includes(p.slug))
            .forEach((p) => {
              const v = p.variants.find((x) => x.size === size && x.stock > 0) ?? p.variants.find((x) => x.stock > 0)!;
              cart.add(p.slug, v.id, 1);
            });
          setDone(true);
        }}
        className="h-14 bg-accent px-8 text-lg text-accent-ink transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
      >
        Agregar {picked.length} {picked.length === 1 ? "prenda" : "prendas"} · {formatCLP(total)}
      </button>
      <p className="min-h-6 text-base" aria-live="polite">
        {done && (
          <>
            Listo, el look quedó en tu carrito. <Link href="/carrito" className="underline underline-offset-4">Ver carrito ({cart.count})</Link>
          </>
        )}
      </p>
    </div>
  );
}
