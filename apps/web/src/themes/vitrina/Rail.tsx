"use client";

import { useRef, type ReactNode } from "react";

// Carril horizontal con flechas (en el teléfono se desliza con el dedo).
export function Rail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={ref} className="flex snap-x gap-3 overflow-x-auto scroll-smooth px-4 pb-4 sm:px-6 [scrollbar-width:none]">
        {children}
      </div>
      <div className="mt-3 flex justify-end gap-2 px-4 sm:px-6">
        <button type="button" aria-label="Anterior" onClick={() => move(-1)} className="grid h-12 w-12 place-items-center bg-ink text-xl text-bg transition-colors hover:bg-accent active:scale-95">←</button>
        <button type="button" aria-label="Siguiente" onClick={() => move(1)} className="grid h-12 w-12 place-items-center bg-ink text-xl text-bg transition-colors hover:bg-accent active:scale-95">→</button>
      </div>
    </div>
  );
}
