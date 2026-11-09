"use client";

import { useSyncExternalStore } from "react";
import { getProduct } from "./catalog";

// Carrito de las previews: vive en localStorage, separado por dirección de diseño.
// En la versión real se sincroniza con el carrito de la API.
export type CartLine = { slug: string; variantId: string; qty: number };

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; lines: CartLine[] }>();
const EMPTY: CartLine[] = [];

function read(key: string): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.lines;
  let lines: CartLine[] = EMPTY;
  try {
    lines = raw ? (JSON.parse(raw) as CartLine[]) : EMPTY;
  } catch {}
  cache.set(key, { raw, lines });
  return lines;
}

function write(key: string, lines: CartLine[]) {
  try {
    localStorage.setItem(key, JSON.stringify(lines));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCart(direction: string) {
  const key = `cart2:${direction}`;
  const lines = useSyncExternalStore(subscribe, () => read(key), () => EMPTY);

  const detailed = lines.flatMap((l) => {
    const product = getProduct(l.slug);
    const variant = product?.variants.find((x) => x.id === l.variantId);
    return product && variant ? [{ ...l, product, variant, total: variant.price * l.qty }] : [];
  });
  const subtotal = detailed.reduce((s, l) => s + l.total, 0);
  const count = detailed.reduce((s, l) => s + l.qty, 0);

  return {
    lines: detailed,
    subtotal,
    count,
    add(slug: string, variantId: string, qty = 1) {
      const cur = read(key);
      const found = cur.find((l) => l.variantId === variantId);
      write(
        key,
        found
          ? cur.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
          : [...cur, { slug, variantId, qty }],
      );
    },
    setQty(variantId: string, qty: number) {
      const cur = read(key);
      write(key, qty <= 0 ? cur.filter((l) => l.variantId !== variantId) : cur.map((l) => (l.variantId === variantId ? { ...l, qty } : l)));
    },
  };
}
