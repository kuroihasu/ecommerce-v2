import Link from "next/link";
import { badgeLabel, formatCLP, type DemoProduct } from "@/designs/catalog";
import { CardPhotos } from "@/designs/CardPhotos";
import { QuickAdd } from "@/designs/BuyBox";

// Ficha de vitrina: foto a sangre, segunda foto al pasar el mouse y precio como bloque sólido.
export function ProductTile({ p, big = false }: { p: DemoProduct; big?: boolean }) {
  const badge = badgeLabel(p);
  return (
    <Link href={`/producto/${p.slug}`} className="group relative block h-full overflow-hidden bg-surface">
      <CardPhotos p={p} sizes={big ? "50vw" : "(max-width: 768px) 50vw, 25vw"} aspect={big ? "aspect-[4/5] md:aspect-[4/5]" : "aspect-[3/4]"} className="h-full" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-2 transition-transform duration-300 group-hover:-translate-y-12 sm:flex-row sm:items-end sm:justify-between sm:gap-2 sm:p-3">
        <span className="bg-bg px-2 py-1.5 text-sm font-semibold leading-tight sm:px-3 sm:py-2 sm:text-base">{p.name}</span>
        <span className="flex shrink-0 flex-col items-start bg-ink px-2 py-1.5 text-sm sm:items-end sm:px-3 sm:py-2 sm:text-base font-semibold text-bg tabular-nums transition-colors group-hover:bg-accent">
          {formatCLP(p.price)}
          {p.compareAtPrice && <s className="text-sm font-normal opacity-70">{formatCLP(p.compareAtPrice)}</s>}
        </span>
      </div>
      <QuickAdd slug={p.slug} direction="tienda" className="quick-add absolute inset-x-0 bottom-0 h-12 bg-ink text-base font-semibold uppercase text-bg">
        + Añadir
      </QuickAdd>
      {badge && (
        <span className={`absolute top-6 left-3 px-3 py-1 text-base font-semibold uppercase ${p.badge === "preventa" ? "bg-ink text-bg" : "bg-accent text-accent-ink"}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
