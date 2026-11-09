import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName, getProduct, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { BuyBox } from "@/designs/BuyBox";
import { Card } from "../../Card";

const B = "/disenos/mercado";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export default async function MercadoProduct({ params }: PageProps<"/disenos/mercado/producto/[slug]">) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.featured && x.slug !== p.slug)).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          {p.gallery.map((g, i) => (
            <Photo key={g} name={g} alt={`${p.name}, foto ${i + 1}`} priority={i === 0} sizes={i === 0 ? "50vw" : "25vw"} className={`${i === 0 ? "col-span-2 aspect-square" : "aspect-square"} rounded-brand`} />
          ))}
        </div>
        <div className="flex flex-col gap-8 rounded-brand bg-surface p-6 md:p-10 lg:sticky lg:top-24 lg:h-fit">
          <Link href={`${B}/catalogo?c=${p.category}`} className="w-fit rounded-full bg-field px-4 py-2 text-base font-semibold text-field-ink">
            {categoryName(p.category)}
          </Link>
          <h1 className="text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-6xl">{p.name}</h1>
          <p className="text-xl leading-relaxed">{p.description}</p>
          <BuyBox slug={p.slug} direction="mercado" cartHref={`${B}/carrito`} />
          <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-8px)] bg-bg p-6 text-base">
            <p className="font-semibold">Hecho en {p.origin}</p>
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
