import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName, getProduct, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { BuyBox } from "@/designs/BuyBox";
import { ProductTile } from "../../ProductTile";

const B = "/disenos/vitrina";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export default async function VitrinaProduct({ params }: PageProps<"/disenos/vitrina/producto/[slug]">) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.featured && x.slug !== p.slug)).slice(0, 4);

  return (
    <div className="px-4 sm:px-6">
      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {p.gallery.map((g, i) => (
            <Photo key={g} name={g} alt={`${p.name}, foto ${i + 1}`} priority={i === 0} sizes="(max-width: 1024px) 85vw, 60vw" className="aspect-[4/3] w-[85vw] shrink-0 snap-start lg:w-auto" />
          ))}
        </div>
        <div className="flex flex-col gap-8 bg-surface p-6 md:p-10 lg:sticky lg:top-[76px] lg:h-fit">
          <p className="text-base font-semibold">
            <Link href={`${B}/catalogo?c=${p.category}`} className="underline underline-offset-4 hover:text-accent">{categoryName(p.category)}</Link> · Hecho en {p.origin}
          </p>
          <h1 className="text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] md:text-8xl">{p.name}</h1>
          <p className="text-xl leading-relaxed">{p.description}</p>
          <BuyBox slug={p.slug} direction="vitrina" cartHref={`${B}/carrito`} label="Agregar" />
          <ul className="grid grid-cols-2 gap-3 text-base font-semibold">
            {p.details.map((d) => <li key={d} className="bg-bg p-4">{d}</li>)}
          </ul>
        </div>
      </div>
      <section className="mt-32">
        <h2 className="mb-6 text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] md:text-8xl">Combina con</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {related.map((r) => <ProductTile key={r.slug} p={r} />)}
        </div>
      </section>
    </div>
  );
}
