import Link from "next/link";
import { formatCLP, fromPrice, type DemoProduct } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";

// Ficha de vitrina: foto a sangre y la etiqueta de precio como bloque sólido.
export function ProductTile({ p, big = false }: { p: DemoProduct; big?: boolean }) {
  return (
    <Link href={`/disenos/vitrina/producto/${p.slug}`} className="group relative block bg-surface">
      <Photo
        name={p.image}
        alt={p.name}
        sizes={big ? "50vw" : "(max-width: 768px) 50vw, 25vw"}
        className={`${big ? "aspect-[4/5] md:aspect-auto md:h-full" : "aspect-[3/4]"} [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.06]`}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="bg-bg px-3 py-2 text-base font-semibold leading-tight">{p.name}</span>
        <span className="shrink-0 bg-ink px-3 py-2 text-base font-semibold text-bg tabular-nums transition-colors group-hover:bg-accent">
          {formatCLP(fromPrice(p))}
        </span>
      </div>
      {(p.isNew || p.variants[0].compareAtPrice) && (
        <span className="absolute top-3 left-3 bg-accent px-3 py-1 text-base font-semibold text-accent-ink">
          {p.isNew ? "Nuevo" : "Oferta"}
        </span>
      )}
    </Link>
  );
}
