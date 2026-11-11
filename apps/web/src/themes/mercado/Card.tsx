import Link from "next/link";
import { badgeLabel, formatCLP, type DemoProduct } from "@/designs/catalog";
import { CardPhotos } from "@/designs/CardPhotos";
import { QuickAdd } from "@/designs/BuyBox";

export function Card({ p }: { p: DemoProduct }) {
  const badge = badgeLabel(p);
  return (
    <Link href={`/producto/${p.slug}`} className="group flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-brand">
        <CardPhotos p={p} sizes="(max-width: 768px) 50vw, 25vw" aspect="aspect-[4/5]" className="rounded-brand" />
        {badge && (
          <span className={`absolute top-6 left-3 rounded-full px-3 py-1 text-sm font-semibold ${p.compareAtPrice ? "bg-[var(--field-2)]" : "bg-field text-field-ink"}`}>
            {badge === "Nuevo" ? "¡Nuevo!" : badge}
          </span>
        )}
        <QuickAdd
          slug={p.slug}
          direction="tienda"
          className="absolute right-3 bottom-3 flex h-12 min-w-12 items-center justify-center rounded-full bg-bg px-4 text-base font-semibold shadow-none transition-all hover:bg-accent hover:text-accent-ink active:scale-90"
        >
          <span aria-label="Agregar al carrito">+ Agregar</span>
        </QuickAdd>
      </div>
      <div className="flex flex-col px-1">
        <span className="text-lg font-semibold leading-snug">{p.name}</span>
        <span className="flex items-baseline gap-2">
          <span className={`text-lg font-semibold tabular-nums ${p.compareAtPrice ? "text-[#b3261e]" : ""}`}>{formatCLP(p.price)}</span>
          {p.compareAtPrice && <s className="text-base text-ink/55">{formatCLP(p.compareAtPrice)}</s>}
        </span>
        {p.colors.length > 1 && <span className="text-base text-ink/70">{p.colors.length} colores</span>}
      </div>
    </Link>
  );
}
