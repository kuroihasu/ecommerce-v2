"use client";

import { useSyncExternalStore } from "react";
import { findProduct } from "./catalog";
import { useCatalogData } from "./CatalogProvider";

// Color elegido en la ficha, compartido entre la galería y el selector de compra.
const chosen = new Map<string, string>();
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useSelectedColor(slug: string): [string, (c: string) => void] {
  const fallback = findProduct(useCatalogData(), slug)?.colors[0]?.name ?? "";
  const color = useSyncExternalStore(subscribe, () => chosen.get(slug) ?? fallback, () => fallback);
  return [
    color,
    (c: string) => {
      chosen.set(slug, c);
      listeners.forEach((l) => l());
    },
  ];
}
