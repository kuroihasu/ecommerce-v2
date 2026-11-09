import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName, getProduct, products } from "@/designs/catalog";
import { Gallery } from "@/designs/Gallery";
import { BuyBox } from "@/designs/BuyBox";
import { Reveal } from "@/designs/Reveal";
import { Card } from "./Card";


export function Product({ slug }: { slug: string }) {
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.featured && x.slug !== p.slug && x.category !== p.category)).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
      <p className="py-6 text-base text-ink/70">
        <Link href={`/catalogo`} className="hover:text-ink">Colección</Link> / <Link href={`/catalogo?c=${p.category}`} className="hover:text-ink">{categoryName(p.category)}</Link>
      </p>
      <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
        <div className="lg:sticky lg:top-28 lg:h-fit"><Gallery slug={p.slug} /></div>
        <div className="flex flex-col gap-7 lg:sticky lg:top-28 lg:h-fit">
          <div className="flex flex-col gap-3">
            <span className="text-lg">{p.short}</span>
            <h1 className="rise font-display text-6xl leading-[0.95] tracking-[-0.02em] md:text-7xl">{p.name}</h1>
          </div>
          <BuyBox slug={p.slug} direction="tienda" cartHref={`/carrito`} />
          <p className="text-lg leading-relaxed">{p.description}</p>
          <details className="group bg-surface p-5 text-base" open>
            <summary className="cursor-pointer text-lg">Detalles y cuidado</summary>
            <ul className="mt-3 flex flex-col gap-1">{p.details.map((d) => <li key={d}>{d}</li>)}</ul>
          </details>
          <details className="bg-surface p-5 text-base">
            <summary className="cursor-pointer text-lg">Envíos y cambios</summary>
            <p className="mt-3">RM $3.500, regiones $5.990, gratis sobre $60.000. Cambios gratis dentro de 30 días.</p>
          </details>
        </div>
      </div>

      <section className="mt-36">
        <Reveal><h2 className="mb-10 font-display text-5xl leading-none">Combínalo con</h2></Reveal>
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {related.map((r, k) => <Reveal key={r.slug} delay={k * 80}><Card p={r} /></Reveal>)}
        </div>
      </section>
    </div>
  );
}
