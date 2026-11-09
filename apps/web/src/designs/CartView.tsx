"use client";

import Link from "next/link";
import { formatCLP, store } from "./catalog";
import { shippingFor, useCart } from "./cart";
import { Photo } from "./Photo";

// Cuerpo del carrito compartido por las tres direcciones; la forma la dan los tokens
// y el título/encabezado lo pone cada dirección.
export function CartView({ direction, base, checkoutLabel = "Ir a pagar" }: {
  direction: string;
  base: string;
  checkoutLabel?: string;
}) {
  const cart = useCart(direction);
  const shipping = shippingFor(cart.subtotal, store.freeShippingFrom);
  const missing = store.freeShippingFrom - cart.subtotal;

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="text-2xl">Tu carrito está vacío.</p>
        <Link href={`${base}/catalogo`} className="rounded-brand bg-accent px-8 py-4 text-lg text-accent-ink transition-transform active:scale-[0.98]">
          Ver el catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <ul className="flex flex-col gap-4">
        {cart.lines.map((l) => (
          <li key={l.variantId} className="grid grid-cols-[96px_1fr] gap-5 rounded-brand bg-surface p-3 sm:grid-cols-[128px_1fr_auto] sm:items-center">
            <Photo name={l.product.image} alt={l.product.name} sizes="128px" className="aspect-square rounded-brand" />
            <div className="flex flex-col gap-1">
              <Link href={`${base}/producto/${l.product.slug}`} className="text-lg hover:underline">{l.product.name}</Link>
              {l.product.variants.length > 1 && <span className="text-base text-ink/70">{l.variant.name}</span>}
              <span className="text-base text-ink/70">{formatCLP(l.variant.price)} c/u</span>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-6 sm:col-span-1 sm:flex-col sm:items-end">
              <div className="flex items-center rounded-brand bg-bg">
                <button aria-label="Quitar uno" onClick={() => cart.setQty(l.variantId, l.qty - 1)} className="h-11 w-11 text-lg">−</button>
                <span className="w-7 text-center tabular-nums">{l.qty}</span>
                <button aria-label="Agregar uno" onClick={() => cart.setQty(l.variantId, l.qty + 1)} className="h-11 w-11 text-lg">+</button>
              </div>
              <span className="text-lg tabular-nums">{formatCLP(l.total)}</span>
            </div>
          </li>
        ))}
      </ul>

      <aside className="flex h-fit flex-col gap-5 rounded-brand bg-field p-8 text-field-ink lg:sticky lg:top-24">
        <p className="text-base">
          {missing > 0
            ? `Te faltan ${formatCLP(missing)} para el despacho gratis.`
            : "Tu pedido tiene despacho gratis."}
        </p>
        <dl className="flex flex-col gap-2 text-lg">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCLP(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Despacho</dt><dd className="tabular-nums">{shipping === 0 ? "Gratis" : formatCLP(shipping)}</dd></div>
          <div className="mt-3 flex justify-between text-2xl"><dt>Total</dt><dd className="tabular-nums">{formatCLP(cart.subtotal + shipping)}</dd></div>
        </dl>
        <a href="#checkout" className="rounded-brand bg-bg px-6 py-4 text-center text-lg text-ink transition-transform active:scale-[0.98]">
          {checkoutLabel}
        </a>
        <p className="text-sm">Pago con Webpay, Mercado Pago o transferencia. IVA incluido.</p>
      </aside>
    </div>
  );
}
