import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName, findProduct } from "@/designs/catalog";
import { getCatalog } from "@/lib/catalog";
import { Gallery } from "@/designs/Gallery";
import { BuyBox } from "@/designs/BuyBox";
import { ProductTile } from "./ProductTile";
import { Reveal } from "@/designs/Reveal";


export async function Product({ slug }: { slug: string }) {
  const catalog = await getCatalog();
  const { products } = catalog;
  const p = findProduct(catalog, slug);
  if (!p) notFound();
  const related = products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.featured && x.slug !== p.slug)).slice(0, 4);

  return (
    <div className="px-4 sm:px-6">
      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <div className="lg:sticky lg:top-28 lg:h-fit"><Gallery slug={p.slug} /></div>
        <div className="flex flex-col gap-8 bg-surface p-6 md:p-10 lg:sticky lg:top-[76px] lg:h-fit">
          <p className="text-base font-semibold">
            <Link href={`/catalogo?c=${p.category}`} className="underline underline-offset-4 hover:text-accent">{categoryName(catalog, p.category)}</Link> · {p.short}
          </p>
          <h1 className="rise text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] md:text-8xl">{p.name}</h1>
          <BuyBox slug={p.slug} direction="tienda" cartHref={`/carrito`} label="Añadir al carrito" />
          <p className="text-xl leading-relaxed">{p.description}</p>
          <ul className="grid grid-cols-2 gap-3 text-base font-semibold">
            {p.details.map((d) => <li key={d} className="bg-bg p-4">{d}</li>)}
          </ul>
        </div>
      </div>
      <section className="mt-32">
        <h2 className="mb-6 text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] md:text-8xl">Combina con</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {related.map((r, k) => <Reveal key={r.slug} delay={k * 70}><ProductTile p={r} /></Reveal>)}
        </div>
      </section>
    </div>
  );
}
