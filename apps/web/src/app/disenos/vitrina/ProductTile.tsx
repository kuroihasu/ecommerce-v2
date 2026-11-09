import Link from "next/link";
import { badgeLabel, formatCLP, type DemoProduct } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { QuickAdd } from "@/designs/BuyBox";

// Ficha de vitrina: foto a sangre, segunda foto al pasar el mouse y precio como bloque sólido.
export function ProductTile({ p, big = false }: { p: DemoProduct; big?: boolean }) {
  const badge = badgeLabel(p);
  return (
    <Link href={`/disenos/vitrina/producto/${p.slug}`} className="group relative block h-full overflow-hidden bg-surface">
      <Photo
        name={p.image}
        hover={p.hover}
        alt={p.name}
        sizes={big ? "50vw" : "(max-width: 768px) 50vw, 25vw"}
        className={`${big ? "aspect-[4/5] md:aspect-auto md:h-full" : "aspect-[3/4]"} [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04]`}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 transition-transform duration-300 group-hover:-translate-y-12">
        <span className="bg-bg px-3 py-2 text-base font-semibold leading-tight">{p.name}</span>
        <span className="flex shrink-0 flex-col items-end bg-ink px-3 py-2 text-base font-semibold text-bg tabular-nums transition-colors group-hover:bg-accent">
          {formatCLP(p.price)}
          {p.compareAtPrice && <s className="text-sm font-normal opacity-70">{formatCLP(p.compareAtPrice)}</s>}
        </span>
      </div>
      <QuickAdd slug={p.slug} direction="vitrina" className="quick-add absolute inset-x-0 bottom-0 h-12 bg-ink text-base font-semibold uppercase text-bg">
        + Añadir
      </QuickAdd>
      {badge && (
        <span className={`absolute top-3 left-3 px-3 py-1 text-base font-semibold uppercase ${p.badge === "preventa" ? "bg-ink text-bg" : "bg-accent text-accent-ink"}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
