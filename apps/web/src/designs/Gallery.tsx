"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { findProduct, photosFor } from "./catalog";
import { useCatalogData } from "./CatalogProvider";
import { canOptimize, photoUrl } from "./images";
import { Photo } from "./Photo";
import { useSelectedColor } from "./selection";

// Galería de la ficha: miniaturas, flechas, deslizar con el dedo y zoom a pantalla
// completa. Las fotos cambian según el color elegido.
export function Gallery({ slug, round = false }: { slug: string; round?: boolean }) {
  const p = findProduct(useCatalogData(), slug)!;
  const [color] = useSelectedColor(slug);
  const photos = photosFor(p, color);
  return <GalleryInner key={color} photos={photos} name={`${p.name}, ${color}`} round={round} />;
}

function GalleryInner({ photos, name, round }: { photos: string[]; name: string; round: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const r = round ? "rounded-brand" : "";
  const thumbR = round ? "rounded-xl" : "";

  const go = useCallback(
    (k: number) => {
      const el = track.current;
      if (!el) return;
      const next = Math.max(0, Math.min(photos.length - 1, k));
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    },
    [photos.length],
  );

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      {/* Miniaturas */}
      <div className="flex gap-2 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible">
        {photos.map((ph, k) => (
          <button
            key={ph + k}
            type="button"
            aria-label={`Ver foto ${k + 1}`}
            aria-current={k === i}
            onClick={() => go(k)}
            className={`relative w-16 shrink-0 overflow-hidden transition-opacity lg:w-20 ${thumbR} ${k === i ? "opacity-100 ring-2 ring-ink" : "opacity-55 hover:opacity-100"}`}
          >
            <Photo name={ph} alt="" sizes="80px" className="aspect-[3/4]" />
          </button>
        ))}
      </div>

      {/* Foto principal: carril con snap, se desliza con el dedo */}
      <div className={`relative flex-1 overflow-hidden ${r}`}>
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setI(Math.round(el.scrollLeft / el.clientWidth));
          }}
          // Arrastrar con el mouse en computador (con el dedo ya desliza solo).
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || !track.current) return;
            drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
            track.current.style.scrollSnapType = "none";
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !track.current) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 5) d.moved = true;
            track.current.scrollLeft = d.left - dx;
          }}
          onPointerUp={() => {
            const d = drag.current;
            const el = track.current;
            if (!d || !el) return;
            el.style.scrollSnapType = "";
            const dx = d.left - el.scrollLeft;
            const from = Math.round(d.left / el.clientWidth);
            go(Math.abs(dx) > el.clientWidth * 0.15 ? from + (dx < 0 ? 1 : -1) : from);
            setTimeout(() => (drag.current = null), 0);
          }}
          onPointerLeave={() => {
            if (drag.current) {
              const el = track.current!;
              el.style.scrollSnapType = "";
              go(Math.round(el.scrollLeft / el.clientWidth));
              drag.current = null;
            }
          }}
          className="flex cursor-grab snap-x snap-mandatory overflow-x-auto select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((ph, k) => (
            <button
              key={ph + k}
              type="button"
              draggable={false}
              onClick={() => {
                if (drag.current?.moved) return;
                setZoom(k);
              }}
              aria-label={`Ampliar foto ${k + 1}`}
              className="w-full shrink-0 snap-center [&_img]:pointer-events-none"
            >
              <Photo name={ph} alt={`${name}, foto ${k + 1}`} priority={k === 0} sizes="(max-width: 1024px) 100vw, 55vw" className="aspect-[3/4]" />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute top-3 right-3 bg-bg/90 px-3 py-1 text-sm tabular-nums">
          {i + 1} / {photos.length}
        </span>
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" onClick={() => go(i - 1)} disabled={i === 0} className="absolute top-1/2 left-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-bg text-xl transition-all hover:scale-105 disabled:opacity-0 md:grid">←</button>
            <button type="button" aria-label="Foto siguiente" onClick={() => go(i + 1)} disabled={i === photos.length - 1} className="absolute top-1/2 right-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-bg text-xl transition-all hover:scale-105 disabled:opacity-0 md:grid">→</button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
              {photos.map((_, k) => <span key={k} className={`h-1.5 rounded-full bg-bg transition-all ${k === i ? "w-6" : "w-1.5 opacity-60"}`} />)}
            </div>
          </>
        )}
      </div>

      {zoom !== null && <Lightbox photos={photos} start={zoom} name={name} onClose={() => setZoom(null)} />}
    </div>
  );
}

// Visor a pantalla completa: flechas, teclado, clic para acercar y mover con el mouse.
function Lightbox({ photos, start, name, onClose }: { photos: string[]; start: number; name: string; onClose: () => void }) {
  const [k, setK] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => {
    setZoomed(false);
    setK((x) => (x + d + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${name}`} className="rise fixed inset-0 z-50 flex flex-col bg-[#0b0b0b] text-white" style={{ animationDuration: "0.3s" }}>
      <div className="flex items-center justify-between p-4">
        <span className="tabular-nums">{k + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} className="h-11 px-4 text-lg" autoFocus>Cerrar ✕</button>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null || zoomed) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <button
          type="button"
          aria-label={zoomed ? "Alejar" : "Acercar"}
          onClick={() => setZoomed((z) => !z)}
          onMouseMove={(e) => {
            const b = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - b.left) / b.width) * 100}% ${((e.clientY - b.top) / b.height) * 100}%`);
          }}
          className={`absolute inset-0 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        >
          <Image
            key={photos[k]}
            src={photoUrl(photos[k])}
            unoptimized={!canOptimize(photoUrl(photos[k]))}
            alt={`${name}, foto ${k + 1}`}
            fill
            sizes="100vw"
            className="object-contain transition-transform duration-300"
            style={{ transform: zoomed ? "scale(2.2)" : "none", transformOrigin: origin }}
          />
        </button>
        <button type="button" aria-label="Anterior" onClick={() => go(-1)} className="absolute top-1/2 left-4 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-white text-2xl text-black">←</button>
        <button type="button" aria-label="Siguiente" onClick={() => go(1)} className="absolute top-1/2 right-4 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-white text-2xl text-black">→</button>
      </div>
      <div className="flex justify-center gap-2 overflow-x-auto p-4">
        {photos.map((ph, x) => (
          <button key={ph + x} type="button" aria-label={`Foto ${x + 1}`} onClick={() => { setZoomed(false); setK(x); }} className={`relative w-14 shrink-0 ${x === k ? "opacity-100 ring-2 ring-white" : "opacity-50"}`}>
            <Photo name={ph} alt="" sizes="56px" className="aspect-[3/4]" />
          </button>
        ))}
      </div>
    </div>
  );
}
