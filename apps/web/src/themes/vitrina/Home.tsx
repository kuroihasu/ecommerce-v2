import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { sectionVisible } from "@/themes/sections";
import { Photo } from "@/designs/Photo";
import { Carousel } from "@/designs/Carousel";
import { storeHero } from "@/themes/hero";
import { Reveal } from "@/designs/Reveal";
import { Countdown, Newsletter } from "@/designs/extras";
import { ProductTile } from "./ProductTile";
import { Rail } from "./Rail";

const H = "text-6xl font-black uppercase leading-[0.85] tracking-[-0.025em] [font-stretch:62%] [word-spacing:0.08em] md:text-8xl";

const dropDate = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }).format(new Date(iso));


export async function Home() {
  const { categories, lines, products, store } = await getCatalog();
  const drop = store.nextDrop;
  const best = products.filter((p) => p.featured);
  const fresh = products.filter((p) => p.badge || p.compareAtPrice);

  const show = sectionVisible(store);
  const hero = storeHero(store, "vitrina");
  return (
    <>
      {/* Portada: carrusel a sangre con titulares gigantes */}
      {show("hero") && (
        <>
        <Carousel
          label="Lanzamientos"
          className="h-[82vh] min-h-[540px] bg-ink"
          autoplay={hero.autoplay}
          interval={hero.interval}
          slides={hero.slides.map((s, k) => (
            <div key={k} className="relative h-full">
              <Photo name={s.image} alt={s.title} priority={k === 0} sizes="100vw" className="slide-media absolute inset-0" />
              <div className="absolute inset-0 bg-black/35" />
              <div className="slide-text absolute inset-x-0 bottom-0 flex flex-col items-start gap-5 p-4 pb-20 text-white sm:p-6 sm:pb-24">
                {s.tag && <span className="bg-accent px-3 py-1 text-base font-semibold uppercase text-accent-ink">{s.tag}</span>}
                <h2 className="max-w-[14ch] text-[clamp(3.6rem,11vw,12rem)] font-black uppercase leading-[0.82] tracking-[-0.025em] [font-stretch:62%] [word-spacing:0.08em]">{s.title}</h2>
                {s.text && <p className="max-w-xl text-xl">{s.text}</p>}
                {s.cta && s.href && <Link href={s.href} className="flex h-14 items-center gap-6 bg-white px-6 text-lg font-semibold uppercase text-black transition-colors hover:bg-accent hover:text-white">
                  {s.cta} <span aria-hidden>→</span>
                </Link>}
              </div>
            </div>
          ))}
        />
        </>
      )}

      {/* Próximo drop: cuenta regresiva */}
      {show("drop") && (
        <>
        {drop && (
        <section className="grid gap-3 bg-accent p-4 text-accent-ink sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold uppercase">Próximo lanzamiento</p>
            <h2 className="text-5xl font-black uppercase leading-[0.85] tracking-[-0.02em] [font-stretch:62%] [word-spacing:0.15em] md:text-7xl">{drop.name}</h2>
            <p className="text-lg first-letter:uppercase">{dropDate(drop.date)}. Te avisamos 10 minutos antes.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Countdown date={drop.date} className="text-5xl font-black [font-stretch:62%] md:min-w-[460px] md:text-6xl" cellClass="bg-ink text-bg" />
            <Newsletter thanks="Listo. Te avisamos antes del lanzamiento." inputClass="bg-bg text-ink" buttonClass="bg-ink text-bg font-semibold uppercase" label="Avísame" />
          </div>
        </section>
        )}
        </>
      )}

      {/* Girls / Men */}
      {show("lines") && (
        <>
        <section className="mt-3 grid grid-cols-2 gap-3 px-4 sm:px-6">
          {lines.map((l, k) => (
            <Reveal key={l.slug} delay={k * 90}>
              <Link href={`/catalogo?l=${l.slug}`} className="group relative block overflow-hidden">
                <Photo name={l.image} alt={l.name} sizes="50vw" className="aspect-[3/4] md:aspect-[4/3] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
                <span className="absolute bottom-3 left-3 text-[clamp(3rem,9vw,9rem)] font-black uppercase leading-[0.8] text-white [font-stretch:62%] transition-transform duration-300 group-hover:-translate-y-2">
                  {l.slug === "mujer" ? "Girls" : "Men"}
                </span>
              </Link>
            </Reveal>
          ))}
        </section>
        </>
      )}

      {/* Más vendidos */}
      {show("bestsellers") && (
        <>
        <section className="mt-32 px-4 sm:px-6">
          <Reveal className="mb-6 flex items-end justify-between gap-4">
            <h2 className={H}>Más vendidos</h2>
            <Link href={`/catalogo`} className="text-lg font-semibold uppercase underline underline-offset-4 hover:text-accent">Ver todo</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Reveal className="col-span-2 row-span-2 min-h-[480px]"><ProductTile p={best[0]} big /></Reveal>
            {best.slice(1, 5).map((p, k) => <Reveal key={p.slug} delay={k * 70}><ProductTile p={p} /></Reveal>)}
          </div>
        </section>
        </>
      )}

      {/* Categorías: lista tipográfica gigante sobre negro */}
      {show("categories") && (
        <>
        <section className="mt-32 bg-field py-16 text-field-ink">
          <ul className="flex flex-col px-4 sm:px-6">
            {categories.map((c, k) => (
              <Reveal as="li" key={c.slug} delay={k * 60}>
                <Link href={`/catalogo?c=${c.slug}`} className="group grid items-center gap-6 py-2 md:grid-cols-[1fr_120px_280px]">
                  <span className="text-[clamp(3rem,10vw,10rem)] font-black uppercase leading-[0.85] tracking-[-0.025em] transition-all duration-300 [font-stretch:62%] group-hover:translate-x-4 group-hover:text-accent">
                    {c.name}
                  </span>
                  <Photo name={c.image} alt="" sizes="120px" className="hidden aspect-square scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 md:block" />
                  <span className="hidden text-lg md:block">{c.blurb}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
        </>
      )}

      {/* Novedades: carril horizontal con flechas */}
      {show("new") && (
        <>
        <section className="mt-32">
          <Reveal className="mb-6 px-4 sm:px-6"><h2 className={H}>New in</h2></Reveal>
          <Rail>
            {fresh.map((p) => (
              <div key={p.slug} className="w-[72vw] shrink-0 snap-start sm:w-[36vw] lg:w-[24vw]">
                <ProductTile p={p} />
              </div>
            ))}
          </Rail>
        </section>
        </>
      )}

      {/* Pagos y envíos */}
      {show("promise") && (
        <>
        <section className="mt-32 grid gap-3 px-4 sm:px-6 md:grid-cols-3">
          {[
            ["6 cuotas", "sin interés con Mercado Pago"],
            ["3 cuotas", "sin interés con Venti"],
            ["$3.500", "envío a la RM, gratis sobre $60.000"],
          ].map(([n, l], k) => (
            <Reveal key={n} delay={k * 80} className="flex flex-col gap-2 bg-surface p-6 md:p-8">
              <span className="text-7xl font-black uppercase leading-none [font-stretch:62%]">{n}</span>
              <span className="text-lg">{l}</span>
            </Reveal>
          ))}
        </section>
        </>
      )}
    </>
  );
}
