"use client";

import { useRef, useState } from "react";
import { type DemoProduct } from "./catalog";
import { Photo } from "./Photo";

// Fotos de la ficha del catálogo: en computador se recorren moviendo el mouse
// de izquierda a derecha; en el teléfono, deslizando. Barritas indican cuál se ve.
export function CardPhotos({ p, sizes, className = "", aspect = "aspect-[3/4]" }: {
  p: DemoProduct;
  sizes: string;
  className?: string;
  aspect?: string;
}) {
  const photos = p.gallery.slice(0, 5);
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseMove={(e) => {
        const el = track.current;
        if (!el || photos.length < 2) return;
        const b = e.currentTarget.getBoundingClientRect();
        const k = Math.min(photos.length - 1, Math.floor(((e.clientX - b.left) / b.width) * photos.length));
        if (k !== i) el.scrollTo({ left: k * el.clientWidth });
      }}
      onMouseLeave={() => track.current?.scrollTo({ left: 0 })}
    >
      <div
        ref={track}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((ph, k) => (
          <Photo key={ph + k} name={ph} alt={k === 0 ? p.name : ""} sizes={sizes} className={`${aspect} w-full shrink-0 snap-center`} />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-100" style={{ paddingLeft: 0 }}>
          {photos.map((_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full transition-colors ${k === i ? "bg-white" : "bg-white/45"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
