import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName, getProduct, products } from "@/designs/catalog";
import { Gallery } from "@/designs/Gallery";
import { BuyBox } from "@/designs/BuyBox";
import { Card } from "./Card";


export function Product({ slug }: { slug: string }) {
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.featured && x.slug !== p.slug)).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:sticky lg:top-28 lg:h-fit"><Gallery slug={p.slug} round /></div>
        <div className="flex flex-col gap-8 rounded-brand bg-surface p-6 md:p-10 lg:sticky lg:top-24 lg:h-fit">
          <Link href={`/catalogo?c=${p.category}`} className="w-fit rounded-full bg-field px-4 py-2 text-base font-semibold text-field-ink">
            {categoryName(p.category)}
          </Link>
          <h1 className="rise text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-6xl">{p.name}</h1>
          <p className="text-xl leading-relaxed">{p.description}</p>
          <BuyBox slug={p.slug} direction="tienda" cartHref={`/carrito`} round />
          <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-8px)] bg-bg p-6 text-base">
            <p className="font-semibold">{p.short}</p>
            <ul className="flex flex-wrap gap-2">
              {p.details.map((d) => <li key={d} className="rounded-full bg-surface px-4 py-2">{d}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <section className="mt-28">
        <h2 className="mb-8 text-5xl font-extrabold leading-[0.95] tracking-[-0.04em]">También te puede gustar</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {related.map((r) => <Card key={r.slug} p={r} />)}
        </div>
      </section>
    </div>
  );
}
