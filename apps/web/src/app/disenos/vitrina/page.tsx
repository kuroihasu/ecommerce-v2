import Link from "next/link";
import { categories, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { ProductTile } from "./ProductTile";

const B = "/disenos/vitrina";

export default function VitrinaHome() {
  const featured = products.filter((p) => p.featured);
  const fresh = products.filter((p) => p.isNew || p.variants[0].compareAtPrice);

  return (
    <>
      {/* Portada: titular gigante condensado sobre una foto a sangre completa */}
      <section className="px-4 sm:px-6">
        <h1 className="rise pt-4 pb-6 text-[clamp(3.6rem,13.5vw,15rem)] font-black uppercase leading-[0.82] tracking-[-0.025em] [font-stretch:62%] [word-spacing:0.08em]">
          Hecho a mano en Chile
        </h1>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <Photo name="room2" alt="Living con mantas de lana y cerámica" priority sizes="(max-width: 768px) 100vw, 66vw" className="drift rise rise-1 aspect-[4/3] md:aspect-[16/10]" />
          <div className="rise rise-2 flex flex-col justify-between gap-8 bg-accent p-6 text-accent-ink md:p-8">
            <p className="text-3xl font-semibold leading-tight [font-stretch:87%]">
              12 piezas de 10 talleres, del altiplano a Chiloé. Despacho gratis sobre $40.000.
            </p>
            <Link href={`${B}/catalogo`} className="flex h-16 items-center justify-between bg-ink px-6 text-xl font-semibold text-bg transition-transform active:scale-[0.98]">
              Comprar ahora <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Destacados: rejilla sin aire, una ficha doble */}
      <section className="mt-32 px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] md:text-8xl">Los más vendidos</h2>
          <Link href={`${B}/catalogo`} className="text-lg font-semibold underline underline-offset-4 hover:text-accent">Ver todo</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2 row-span-2 min-h-[480px]"><ProductTile p={featured[0]} big /></div>
          {featured.slice(1, 5).map((p) => <ProductTile key={p.slug} p={p} />)}
        </div>
      </section>

      {/* Categorías: lista tipográfica gigante sobre negro */}
      <section className="mt-32 bg-field py-16 text-field-ink">
        <ul className="flex flex-col px-4 sm:px-6">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`${B}/catalogo?c=${c.slug}`} className="group grid items-center gap-6 py-3 md:grid-cols-[1fr_280px]">
                <span className="text-[clamp(3rem,11vw,11rem)] font-black uppercase leading-[0.85] tracking-[-0.04em] transition-colors [font-stretch:62%] group-hover:text-accent">
                  {c.name}
                </span>
                <span className="hidden text-lg md:block">{c.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Novedades y ofertas: carrusel horizontal */}
      <section className="mt-32">
        <h2 className="mb-6 px-4 text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] sm:px-6 md:text-8xl">Recién llegados</h2>
        <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:px-6">
          {fresh.concat(products.slice(6, 9)).map((p) => (
            <div key={p.slug} className="w-[72vw] shrink-0 snap-start sm:w-[36vw] lg:w-[24vw]">
              <ProductTile p={p} />
            </div>
          ))}
        </div>
      </section>

      {/* Taller: foto grande + texto grande */}
      <section className="mt-32 grid gap-3 px-4 sm:px-6 md:grid-cols-2">
        <Photo name="hands" alt="Manos torneando greda" sizes="50vw" className="aspect-square" />
        <div className="flex flex-col justify-between gap-10 bg-surface p-6 md:p-10">
          <h2 className="text-6xl font-black uppercase leading-[0.85] tracking-[-0.03em] [font-stretch:62%] md:text-8xl">Sin fábrica</h2>
          <div className="flex flex-col gap-6 text-xl leading-relaxed">
            <p>Compramos directo a ceramistas, tejedoras y veleros. Cada ficha dice el pueblo donde se hizo la pieza.</p>
            <dl className="grid grid-cols-3 gap-4">
              {[["10", "talleres"], ["48 h", "despacho"], ["30", "días para cambios"]].map(([n, l]) => (
                <div key={l} className="flex flex-col">
                  <dt className="text-5xl font-black [font-stretch:62%]">{n}</dt>
                  <dd className="text-base">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
