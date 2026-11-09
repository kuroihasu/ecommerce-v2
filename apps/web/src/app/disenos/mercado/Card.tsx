import Link from "next/link";
import { formatCLP, fromPrice, type DemoProduct } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";

export function Card({ p }: { p: DemoProduct }) {
  return (
    <Link href={`/disenos/mercado/producto/${p.slug}`} className="group flex flex-col gap-3">
      <div className="relative">
        <Photo name={p.image} alt={p.name} sizes="(max-width: 768px) 50vw, 25vw" className="aspect-square rounded-brand [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-105" />
        {(p.isNew || p.variants[0].compareAtPrice) && (
          <span className="absolute top-3 left-3 rounded-full bg-field px-3 py-1 text-sm font-semibold text-field-ink">
            {p.isNew ? "Nuevo" : "Oferta"}
          </span>
        )}
      </div>
      <div className="flex flex-col px-1">
        <span className="text-lg font-semibold leading-snug">{p.name}</span>
        <span className="text-base text-ink/70">{p.short}</span>
        <span className="mt-1 text-lg font-semibold tabular-nums">{formatCLP(fromPrice(p))}</span>
      </div>
    </Link>
  );
}
