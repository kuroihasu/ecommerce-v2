import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { sectionVisible } from "@/themes/sections";
import { Photo } from "@/designs/Photo";
import { Carousel } from "@/designs/Carousel";
import { storeHero } from "@/themes/hero";
import { Reveal } from "@/designs/Reveal";
import { ScrollRail } from "@/designs/ScrollRail";
import { Card } from "./Card";
import { GiftFinder } from "./GiftFinder";



// Fondo de cada banner, en orden: los campos de color de la marca.
const fields = ["bg-field text-field-ink", "bg-[var(--field-2)] text-ink", "bg-accent text-accent-ink"];

export async function Home() {
  const { categories, products, store } = await getCatalog();
  const fresh = products.filter((p) => p.badge === "nuevo" || p.featured).slice(0, 8);
  const sale = products.filter((p) => p.compareAtPrice);

  const show = sectionVisible(store);
  const hero = storeHero(store, "mercado");
  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6">
      {/* Portada: carrusel de campos de color */}
      {show("hero") && (
        <>
        <div className="mx-auto w-full max-w-[1440px]">
          <Carousel
            label="Campañas"
            controls="pill"
            className="rounded-brand"
            autoplay={hero.autoplay}
            interval={hero.interval}
            slides={hero.slides.map((s, k) => (
              <div key={k} className={`grid h-full gap-6 rounded-brand p-4 md:min-h-[600px] md:grid-cols-2 md:p-6 ${fields[k % fields.length]}`}>
                <div className="slide-text flex flex-col justify-center gap-6 p-4 pb-2 md:p-8">
                  {s.tag && <span className="w-fit rounded-full bg-bg/80 px-4 py-1.5 text-base font-semibold text-ink">{s.tag}</span>}
                  <h1 className="text-[clamp(3rem,6.4vw,6.8rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">{s.title}</h1>
                  {s.text && <p className="max-w-md text-xl leading-relaxed">{s.text}</p>}
                  {s.cta && s.href && <Link href={s.href} className="w-fit rounded-full bg-ink px-8 py-4 text-lg font-semibold text-bg transition-transform hover:-translate-y-0.5 active:scale-95">{s.cta}</Link>}
                </div>
                <Photo name={s.image} alt={s.title} priority={k === 0} sizes="(max-width: 768px) 100vw, 50vw" className="slide-media aspect-[4/5] rounded-[calc(var(--radius)-8px)] md:aspect-auto" />
              </div>
            ))}
          />
        </div>
        </>
      )}

      {/* Categorías en burbujas */}
      {show("categories") && (
        <>
        <section className="mx-auto mt-12 w-full max-w-[1440px]">
          <ScrollRail label="Categorías" className="justify-start gap-5 md:justify-between">
            {categories.map((c, k) => (
              <Reveal key={c.slug} delay={k * 60} className="shrink-0 snap-start">
                <Link href={`/catalogo?c=${c.slug}`} className="group flex w-28 flex-col items-center gap-3 md:w-40">
                  <Photo name={c.image} alt="" sizes="160px" className="aspect-square w-full rounded-full transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-3" />
                  <span className="text-lg font-semibold">{c.name}</span>
                </Link>
              </Reveal>
            ))}
          </ScrollRail>
        </section>
        </>
      )}

      {/* Lo nuevo */}
      {show("new") && (
        <>
        <section className="mx-auto mt-24 w-full max-w-[1440px]">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">¡Llegó lo nuevo!</h2>
            <Link href={`/catalogo?o=nuevos`} className="rounded-full bg-surface px-6 py-3 text-lg font-semibold transition-colors hover:bg-field">Ver todo</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {fresh.map((p, k) => <Reveal key={p.slug} delay={(k % 4) * 70}><Card p={p} /></Reveal>)}
          </div>
        </section>
        </>
      )}

      {/* Banner de ofertas */}
      {show("sale") && (
        <>
        <Reveal as="section" className="mx-auto mt-24 grid w-full max-w-[1440px] gap-4 rounded-brand bg-[var(--field-2)] p-4 md:grid-cols-[1fr_2fr] md:p-6">
          <div className="flex flex-col justify-between gap-8 p-4 md:p-6">
            <h2 className="text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">Hasta 33% off</h2>
            <p className="text-xl">Polerones, cargos y vestidos con precio rebajado mientras dure el stock.</p>
            <Link href={`/catalogo?o=ofertas`} className="w-fit rounded-full bg-ink px-8 py-4 text-lg font-semibold text-bg transition-transform hover:-translate-y-0.5 active:scale-95">Ver todas las ofertas</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {sale.slice(0, 3).map((p) => <Card key={p.slug} p={p} />)}
          </div>
        </Reveal>
        </>
      )}

      {/* Buscador por precio */}
      {show("giftfinder") && (
        <>
        <section id="regalos" className="mx-auto mt-24 w-full max-w-[1440px] scroll-mt-24 rounded-brand bg-surface px-6 py-14 md:px-12">
          <Reveal><h2 className="mb-8 text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">¿Cuánto quieres gastar?</h2></Reveal>
          <GiftFinder />
        </section>
        </>
      )}

      {/* Promesa */}
      {show("promise") && (
        <>
        <section className="mx-auto mt-24 grid w-full max-w-[1440px] gap-4 md:grid-cols-3">
          {[
            ["bg-field text-field-ink", "Envío a todo Chile", "RM $3.500 y regiones $5.990. Gratis sobre $60.000."],
            ["bg-[var(--field-2)]", "Cambios gratis", "Tienes 30 días para cambiar la talla o el color."],
            ["bg-accent text-accent-ink", "Paga en cuotas", "6 cuotas sin interés con Mercado Pago, o 3 con Venti."],
          ].map(([bg, t, d], k) => (
            <Reveal key={t} delay={k * 80} className={`flex flex-col gap-3 rounded-brand p-8 transition-transform hover:-translate-y-1 ${bg}`}>
              <h3 className="text-3xl font-bold tracking-[-0.02em]">{t}</h3>
              <p className="text-lg leading-relaxed">{d}</p>
            </Reveal>
          ))}
        </section>
        </>
      )}
    </div>
  );
}
