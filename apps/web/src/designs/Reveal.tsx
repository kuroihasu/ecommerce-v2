"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Entrada al hacer scroll: el bloque sube y aparece cuando entra en pantalla.
// Sin JavaScript (o con "reducir movimiento") el contenido se ve igual, sin animar.
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return; // ya visible al cargar
    el.classList.add("reveal-pending");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("reveal-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // @ts-expect-error: ref genérico para las tres etiquetas
    <Tag ref={ref} className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
