"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { checkDiscount } from "@/lib/discounts";
import { formatCLP, installment } from "./catalog";
import { useCatalogData } from "./CatalogProvider";
import { useCart } from "./cart";
import { trackBeginCheckout } from "./tracking";
import { Photo } from "./Photo";

// Cuerpo del carrito compartido por las tres direcciones; la forma la dan los tokens.
export function CartView({ direction, base, checkoutLabel = "Ir a pagar", round = false }: {
  direction: string;
  base: string;
  checkoutLabel?: string;
  round?: boolean;
}) {
  const cart = useCart(direction);
  const { store } = useCatalogData();
  const [region, setRegion] = useState<"rm" | "regiones">("rm");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; percent: number } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const r = round ? "rounded-full" : "rounded-brand";

  const discount = applied ? Math.round((cart.subtotal * applied.percent) / 100) : 0;
  const afterDiscount = cart.subtotal - discount;
  const shipping = afterDiscount >= store.freeShippingFrom ? 0 : region === "rm" ? store.shippingRM : store.shippingRegions;
  const total = afterDiscount + shipping;
  const missing = store.freeShippingFrom - afterDiscount;

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="text-2xl">Tu carrito está vacío.</p>
        <Link href={`${base}/catalogo`} className={`bg-accent px-8 py-4 text-lg text-accent-ink transition-transform active:scale-[0.98] ${r}`}>
          Ver el catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-4">
        <div className="rounded-brand bg-surface p-5">
          <p className="mb-3 text-base">
            {missing > 0 ? `Te faltan ${formatCLP(missing)} para el envío gratis.` : "¡Tu pedido tiene envío gratis!"}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.min(100, (afterDiscount / store.freeShippingFrom) * 100)}%` }} />
          </div>
        </div>
        <ul className="flex flex-col gap-4">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="grid grid-cols-[96px_1fr] gap-5 rounded-brand bg-surface p-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <Photo name={l.product.image} alt={l.product.name} sizes="120px" className="aspect-[3/4] rounded-brand" />
              <div className="flex flex-col gap-1">
                <Link href={`${base}/producto/${l.product.slug}`} className="text-lg hover:underline">{l.product.name}</Link>
                <span className="text-base text-ink/70">{l.variant.color}{l.product.sizes.length > 1 && ` · Talla ${l.variant.size}`}</span>
                <span className="text-base text-ink/70">{formatCLP(l.variant.price)} c/u</span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-6 sm:col-span-1 sm:flex-col sm:items-end">
                <div className={`flex items-center bg-bg ${r}`}>
                  <button aria-label="Quitar uno" onClick={() => cart.setQty(l.variantId, l.qty - 1)} className="h-11 w-11 text-lg transition-transform active:scale-90">−</button>
                  <span className="w-7 text-center tabular-nums">{l.qty}</span>
                  <button aria-label="Agregar uno" onClick={() => cart.setQty(l.variantId, l.qty + 1)} className="h-11 w-11 text-lg transition-transform active:scale-90">+</button>
                </div>
                <span className="text-lg tabular-nums">{formatCLP(l.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex h-fit flex-col gap-5 rounded-brand bg-field p-8 text-field-ink lg:sticky lg:top-28">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startCheck(async () => {
              const res = await checkDiscount(code);
              setApplied(res.ok ? { code: res.code, percent: res.percent } : null);
              setCodeError(res.ok ? null : res.error);
            });
          }}
        >
          <label className="sr-only" htmlFor={`code-${direction}`}>Código de descuento</label>
          <input
            id={`code-${direction}`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={store.discountCode ? `Código (prueba ${store.discountCode})` : "Código de descuento"}
            className={`h-12 min-w-0 flex-1 bg-bg px-4 text-base text-ink ${r}`}
          />
          <button disabled={checking} className={`h-12 bg-ink px-5 text-base text-bg disabled:opacity-60 ${r}`}>{checking ? "Revisando…" : "Aplicar"}</button>
        </form>
        <p aria-live="polite" className="-mt-3 text-base empty:hidden">{codeError}</p>

        <fieldset className="flex gap-2 text-base">
          <legend className="mb-2">Envío</legend>
          {(["rm", "regiones"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={region === k}
              onClick={() => setRegion(k)}
              className={`h-11 flex-1 px-3 transition-colors ${r} ${region === k ? "bg-ink text-bg" : "bg-bg text-ink"}`}
            >
              {k === "rm" ? "Región Metropolitana" : "Regiones"}
            </button>
          ))}
        </fieldset>

        <dl className="flex flex-col gap-2 text-lg">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCLP(cart.subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between"><dt>{applied?.code} (−{applied?.percent}%)</dt><dd className="tabular-nums">−{formatCLP(discount)}</dd></div>}
          <div className="flex justify-between"><dt>Envío</dt><dd className="tabular-nums">{shipping === 0 ? "Gratis" : formatCLP(shipping)}</dd></div>
          <div className="mt-3 flex justify-between text-2xl"><dt>Total</dt><dd className="tabular-nums">{formatCLP(total)}</dd></div>
        </dl>
        <p className="-mt-2 text-base">o {store.installments} cuotas sin interés de {installment(total, store.installments)}</p>
        <a href="#checkout" onClick={() => trackBeginCheckout(cart.lines.map((l) => ({ id: l.variant.id, group: l.product.slug, name: l.product.name, price: l.variant.price, qty: l.qty })))} className={`bg-bg px-6 py-4 text-center text-lg text-ink transition-transform active:scale-[0.98] ${r}`}>
          {checkoutLabel}
        </a>
        <p className="text-sm">Paga con Webpay, Mercado Pago o Venti. Cambios gratis dentro de 30 días.</p>
      </aside>
    </div>
  );
}
