"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCLP, getProduct, installment, store, discountPct } from "./catalog";
import { useCart } from "./cart";

// Selector de color (muestras) + talla + cantidad + agregar. Forma y color salen de los tokens.
export function BuyBox({ slug, direction, cartHref, label = "Agregar al carrito", round = false }: {
  slug: string;
  direction: string;
  cartHref: string;
  label?: string;
  round?: boolean;
}) {
  const p = getProduct(slug)!;
  const cart = useCart(direction);
  const [color, setColor] = useState(p.colors[0].name);
  const [size, setSize] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0] : null);
  const [added, setAdded] = useState(false);
  const [warn, setWarn] = useState(false);
  const [guide, setGuide] = useState(false);
  const variant = p.variants.find((v) => v.color === color && v.size === size);
  const r = round ? "rounded-full" : "rounded-brand";

  const add = () => {
    if (!variant) return setWarn(true);
    cart.add(p.slug, variant.id, 1);
    setAdded(true);
    setWarn(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-3 text-3xl">
          <span>{formatCLP(p.price)}</span>
          {p.compareAtPrice && (
            <>
              <s className="text-lg text-ink/55">{formatCLP(p.compareAtPrice)}</s>
              <span className="bg-accent px-2 py-0.5 text-base text-accent-ink">−{discountPct(p)}%</span>
            </>
          )}
        </p>
        <p className="text-base text-ink/75">
          {store.installments} cuotas sin interés de {installment(p.price)} con Mercado Pago
        </p>
      </div>

      {p.colors.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-base">Color: <strong className="font-semibold">{color}</strong></legend>
          <div className="flex flex-wrap gap-3">
            {p.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={c.name === color}
                onClick={() => setColor(c.name)}
                className={`h-10 w-10 rounded-full p-1 transition-transform hover:scale-110 ${c.name === color ? "bg-ink" : "bg-surface"}`}
              >
                <span className="block h-full w-full rounded-full" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {p.sizes.length > 1 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 flex w-full items-baseline justify-between gap-4 text-base">
            <span>Talla{size ? `: ${size}` : ""}</span>
            <button type="button" onClick={() => setGuide((g) => !g)} className="underline underline-offset-4">
              Guía de tallas
            </button>
          </legend>
          <div className="flex flex-wrap gap-2">
            {p.sizes.map((s) => {
              const out = p.soldOut?.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out}
                  aria-pressed={s === size}
                  onClick={() => {
                    setSize(s);
                    setWarn(false);
                  }}
                  className={`h-12 min-w-14 px-4 text-base transition-all active:scale-95 ${r} ${
                    out ? "cursor-not-allowed bg-surface text-ink/35 line-through" : s === size ? "bg-ink text-bg" : "bg-surface hover:bg-ink/15"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {guide && (
            <table className="mt-2 w-full text-left text-base">
              <thead>
                <tr className="bg-surface"><th className="p-2">Talla</th><th className="p-2">Pecho</th><th className="p-2">Largo</th></tr>
              </thead>
              <tbody>
                {[["S", "104", "68"], ["M", "110", "70"], ["L", "116", "72"], ["XL", "122", "74"]].map((row) => (
                  <tr key={row[0]}>{row.map((c) => <td key={c} className="p-2">{c}{c !== row[0] && " cm"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </fieldset>
      )}

      <button
        type="button"
        onClick={add}
        className={`h-14 w-full px-8 text-lg transition-all duration-150 hover:brightness-110 active:scale-[0.98] ${r} ${
          p.badge === "preventa" ? "bg-ink text-bg" : "bg-accent text-accent-ink"
        }`}
      >
        {p.badge === "preventa" ? "Reservar en preventa" : label}
      </button>

      <p className="min-h-6 text-base" aria-live="polite">
        {warn ? (
          <span className="text-accent">Elige una talla para continuar.</span>
        ) : added ? (
          <>
            Listo, quedó en tu carrito.{" "}
            <Link href={cartHref} className="underline underline-offset-4">Ver carrito ({cart.count})</Link>
          </>
        ) : p.badge === "ultimas" ? (
          "Quedan pocas unidades en cada talla."
        ) : p.badge === "preventa" ? (
          "Se despacha desde el 25 de noviembre."
        ) : (
          `Envío a todo Chile. Gratis sobre ${formatCLP(store.freeShippingFrom)}.`
        )}
      </p>
    </div>
  );
}

export function CartCount({ direction, className = "" }: { direction: string; className?: string }) {
  const { count } = useCart(direction);
  return <span className={className}>{count}</span>;
}

// "Agregar" rápido desde la ficha del catálogo: primera talla disponible del primer color.
export function QuickAdd({ slug, direction, className = "", children }: {
  slug: string;
  direction: string;
  className?: string;
  children: React.ReactNode;
}) {
  const p = getProduct(slug)!;
  const cart = useCart(direction);
  const [done, setDone] = useState(false);
  const v = p.variants.find((x) => x.stock > 0)!;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        cart.add(p.slug, v.id, 1);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={className}
    >
      {done ? `Agregado (${v.size})` : children}
    </button>
  );
}
