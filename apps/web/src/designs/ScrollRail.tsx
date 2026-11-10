"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Fila horizontal que se desliza cuando no cabe todo (p. ej. categorías en burbujas).
// Sin barra de scroll visible; en computador muestra flechas y un degradado en el
// borde solo cuando hay más contenido hacia ese lado.
export function ScrollRail({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [update]);

  const move = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const fade = `linear-gradient(to right, ${edges.left ? "transparent, #000 64px" : "#000"}, ${edges.right ? "#000 calc(100% - 64px), transparent" : "#000"})`;

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        role="region"
        aria-label={label}
        style={{ maskImage: fade, WebkitMaskImage: fade }}
        className={`flex snap-x overflow-x-auto overflow-y-hidden overscroll-x-contain pt-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {(["left", "right"] as const).map((side) => (
        <button
          key={side}
          type="button"
          aria-label={side === "left" ? "Ver anteriores" : "Ver más"}
          onClick={() => move(side === "left" ? -1 : 1)}
          tabIndex={edges[side] ? 0 : -1}
          className={`absolute top-[calc(50%-1rem)] ${side === "left" ? "left-1" : "right-1"} hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-bg text-ink shadow-md ring-1 ring-ink/10 transition-opacity hover:bg-surface md:flex ${edges[side] ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={side === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
          </svg>
        </button>
      ))}
    </div>
  );
}
