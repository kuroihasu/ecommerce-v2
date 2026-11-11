"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Carrusel de banners: avanza solo (si autoplay) cada `interval` ms, se pausa al pasar el mouse o al
// enfocar, se mueve con flechas, puntos, teclado y deslizando el dedo.
export function Carousel({
  slides,
  label,
  className = "",
  controls = "square",
  interval = 6000,
  autoplay = true,
}: {
  slides: ReactNode[];
  label: string;
  className?: string;
  controls?: "square" | "pill" | "bar";
  interval?: number;
  autoplay?: boolean;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (!autoplay || n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(i + 1), interval);
    return () => clearTimeout(t);
  }, [i, paused, go, interval, autoplay, n]);

  const round = controls === "pill" ? "rounded-full" : "";

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={label}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(i + 1);
        if (e.key === "ArrowLeft") go(i - 1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div className="relative h-full">
        {slides.map((s, k) => (
          <div
            key={k}
            role="group"
            aria-roledescription="banner"
            aria-label={`${k + 1} de ${n}`}
            aria-hidden={k !== i}
            inert={k !== i}
            className={`slide ${k === 0 ? "relative" : "absolute inset-0"} h-full transition-[opacity,transform] duration-700 ease-out ${
              k === i ? "slide-active opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {n > 1 && (
      <div className="absolute right-4 bottom-4 z-10 flex items-center gap-2 sm:right-6 sm:bottom-6">
        <button
          type="button"
          aria-label="Banner anterior"
          onClick={() => go(i - 1)}
          className={`grid h-11 w-11 place-items-center bg-bg text-ink transition-transform hover:scale-105 active:scale-95 ${round}`}
        >
          ←
        </button>
        <div className="flex items-center gap-1.5 px-1">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Ir al banner ${k + 1}`}
              aria-current={k === i}
              onClick={() => go(k)}
              className={`h-1.5 overflow-hidden transition-all ${round} ${k === i ? (autoplay ? "w-10 bg-bg/50" : "w-10 bg-bg") : "w-4 bg-bg/50"}`}
            >
              {k === i && autoplay && (
                <span
                  key={`${i}-${paused}`}
                  className={`carousel-progress block h-full bg-bg ${round}`}
                  style={{ animationDuration: `${interval}ms`, animationPlayState: paused ? "paused" : "running" }}
                />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Banner siguiente"
          onClick={() => go(i + 1)}
          className={`grid h-11 w-11 place-items-center bg-bg text-ink transition-transform hover:scale-105 active:scale-95 ${round}`}
        >
          →
        </button>
      </div>
      )}
    </section>
  );
}
