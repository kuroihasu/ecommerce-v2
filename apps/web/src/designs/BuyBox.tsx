"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCLP, getProduct } from "./catalog";
import { useCart } from "./cart";

// Selector de variante + cantidad + agregar. Toma forma y color de los tokens.
export function BuyBox({ slug, direction, cartHref, label = "Agregar al carrito" }: {
  slug: string;
  direction: string;
  cartHref: string;
  label?: string;
}) {
  const product = getProduct(slug)!;
  const cart = useCart(direction);
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((x) => x.id === variantId)!;
  const many = product.variants.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-baseline gap-3 text-2xl">
        <span>{formatCLP(variant.price)}</span>
        {variant.compareAtPrice && <s className="text-base text-ink/55">{formatCLP(variant.compareAtPrice)}</s>}
      </p>

      {many && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-base">Color: {variant.name}</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setVariantId(x.id)}
                aria-pressed={x.id === variantId}
                className={`min-h-11 rounded-brand px-5 text-base transition-colors duration-200 ${
                  x.id === variantId ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-ink/15"
                }`}
              >
                {x.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center rounded-brand bg-surface">
          <button type="button" aria-label="Quitar uno" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-14 w-12 text-xl transition-transform active:scale-90">−</button>
          <span className="w-8 text-center text-lg tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Agregar uno" onClick={() => setQty((q) => Math.min(variant.stock, q + 1))} className="h-14 w-12 text-xl transition-transform active:scale-90">+</button>
        </div>
        <button
          type="button"
          onClick={() => {
            cart.add(product.slug, variant.id, qty);
            setAdded(true);
          }}
          className="h-14 flex-1 rounded-brand bg-accent px-8 text-lg text-accent-ink transition-transform duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          {label}
        </button>
      </div>

      <p className="min-h-6 text-base" aria-live="polite">
        {added ? (
          <>
            Listo, quedó en tu carrito.{" "}
            <Link href={cartHref} className="underline underline-offset-4">Ver carrito ({cart.count})</Link>
          </>
        ) : variant.stock <= 5 ? (
          `Quedan ${variant.stock} unidades.`
        ) : (
          "En stock, despacho en 48 horas hábiles."
        )}
      </p>
    </div>
  );
}

export function CartCount({ direction, className = "" }: { direction: string; className?: string }) {
  const { count } = useCart(direction);
  return <span className={className}>{count}</span>;
}
