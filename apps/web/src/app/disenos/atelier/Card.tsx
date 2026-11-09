import Link from "next/link";
import { badgeLabel, formatCLP, type DemoProduct } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { QuickAdd } from "@/designs/BuyBox";

export function Card({ p, sizes = "(max-width: 768px) 50vw, 25vw" }: { p: DemoProduct; sizes?: string }) {
  const badge = badgeLabel(p);
  return (
    <Link href={`/disenos/atelier/producto/${p.slug}`} className="group flex flex-col gap-3">
      <div className="relative overflow-hidden">
        <Photo name={p.image} hover={p.hover} alt={p.name} sizes={sizes} className="aspect-[3/4] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-[1.03]" />
        {badge && <span className="absolute top-3 left-3 bg-bg px-3 py-1 text-sm">{badge}</span>}
        <QuickAdd slug={p.slug} direction="atelier" className="quick-add absolute inset-x-0 bottom-0 bg-ink/90 py-3 text-base text-bg">
          Agregar rápido
        </QuickAdd>
      </div>
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-2xl leading-tight">{p.name}</span>
        <span className="flex shrink-0 flex-col items-end text-base tabular-nums">
          {formatCLP(p.price)}
          {p.compareAtPrice && <s className="text-sm text-ink/55">{formatCLP(p.compareAtPrice)}</s>}
        </span>
      </div>
      {p.colors.length > 1 && (
        <span className="-mt-1 flex gap-1.5" aria-label={`${p.colors.length} colores`}>
          {p.colors.map((c) => <span key={c.name} className="h-3.5 w-3.5 rounded-full" style={{ background: c.hex }} />)}
        </span>
      )}
    </Link>
  );
}
