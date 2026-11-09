import Link from "next/link";
import { categories, formatCLP, fromPrice, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";

const B = "/disenos/taller";

export default function TallerCatalog() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
      <div className="grid gap-8 pt-10 pb-16 lg:grid-cols-[5fr_7fr] lg:items-end">
        <h1 className="rise font-display text-[clamp(3.5rem,7vw,7rem)] leading-[0.92] tracking-[-0.03em]">Catálogo</h1>
        <nav className="rise rise-1 flex flex-wrap gap-x-8 gap-y-3 text-xl" aria-label="Categorías">
          {categories.map((c) => (
            <a key={c.slug} href={`#${c.slug}`} className="hover:opacity-60">
              {c.name} <span className="text-ink/60">{products.filter((p) => p.category === c.slug).length}</span>
            </a>
          ))}
        </nav>
      </div>

      {categories.map((c) => (
        <section key={c.slug} id={c.slug} className="scroll-mt-28 pb-28">
          <div className="mb-10 grid gap-4 bg-surface p-8 md:grid-cols-[1fr_1fr] md:items-end">
            <h2 className="font-display text-6xl leading-none">{c.name}</h2>
            <p className="max-w-md text-lg">{c.blurb}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
            {products
              .filter((p) => p.category === c.slug)
              .map((p) => (
                <Link key={p.slug} href={`${B}/producto/${p.slug}`} className="group flex flex-col gap-3">
                  <Photo name={p.image} alt={p.name} sizes="(max-width: 1024px) 50vw, 33vw" className="aspect-[4/5] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
                  <span className="font-display text-3xl leading-tight">{p.name}</span>
                  <span className="-mt-2 text-base text-ink/70">{p.short}</span>
                  <span className="flex items-baseline gap-3 text-lg tabular-nums">
                    {p.variants.length > 1 && "Desde "}
                    {formatCLP(fromPrice(p))}
                    {p.variants[0].compareAtPrice && <s className="text-base text-ink/55">{formatCLP(p.variants[0].compareAtPrice)}</s>}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
