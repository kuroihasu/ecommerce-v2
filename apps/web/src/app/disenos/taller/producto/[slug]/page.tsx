import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName, formatCLP, fromPrice, getProduct, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { BuyBox } from "@/designs/BuyBox";

const B = "/disenos/taller";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export default async function TallerProduct({ params }: PageProps<"/disenos/taller/producto/[slug]">) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
      <p className="py-6 text-base text-ink/70">
        <Link href={`${B}/catalogo`} className="hover:text-ink">Catálogo</Link> / <Link href={`${B}/catalogo#${p.category}`} className="hover:text-ink">{categoryName(p.category)}</Link>
      </p>
      <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
        <div className="grid grid-cols-2 gap-4">
          {p.gallery.map((g, i) => (
            <Photo key={g} name={g} alt={`${p.name}, foto ${i + 1}`} priority={i === 0} sizes={i === 0 ? "60vw" : "30vw"} className={i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"} />
          ))}
        </div>
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:h-fit">
          <div className="flex flex-col gap-3">
            <span className="text-lg">Hecho en {p.origin}</span>
            <h1 className="font-display text-6xl leading-[0.95] tracking-[-0.02em] md:text-7xl">{p.name}</h1>
          </div>
          <p className="text-xl leading-relaxed">{p.description}</p>
          <BuyBox slug={p.slug} direction="taller" cartHref={`${B}/carrito`} />
          <dl className="grid grid-cols-2 gap-4 bg-surface p-6 text-base">
            {p.details.map((d) => (
              <dd key={d}>{d}</dd>
            ))}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-40">
          <h2 className="mb-10 font-display text-5xl leading-none">Del mismo estante</h2>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`${B}/producto/${r.slug}`} className="group flex flex-col gap-3">
                <Photo name={r.image} alt={r.name} sizes="33vw" className="aspect-[4/5] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
                <span className="font-display text-3xl">{r.name}</span>
                <span className="text-lg tabular-nums">{formatCLP(fromPrice(r))}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
