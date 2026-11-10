import Link from "next/link";
import { findProduct } from "@/designs/catalog";
import { getCatalog } from "@/lib/catalog";
import { sectionVisible } from "@/themes/sections";
import { Photo } from "@/designs/Photo";
import { Carousel } from "@/designs/Carousel";
import { Reveal } from "@/designs/Reveal";
import { ScrollRail } from "@/designs/ScrollRail";
import { Card } from "./Card";
import { ShopTheLook } from "./ShopTheLook";


const slides = [
  { image: "woman3", bg: "bg-field text-field-ink", title: "Nueva colección mujer", text: "Vestidos, jeans wide leg y básicos suaves para armar tus looks de temporada.", cta: "Ver lo nuevo", href: `/catalogo?o=nuevos` },
  { image: "dress2", bg: "bg-[var(--field-2)] text-ink", title: "Vestidos para cada ocasión", text: "Satinados, florales y midi. Desde $24.990.", cta: "Ver vestidos", href: `/catalogo?c=vestidos` },
  { image: "woman2", bg: "bg-accent text-accent-ink", title: "Ofertas de la semana", text: "Hasta 33% off en prendas seleccionadas. Solo hasta el domingo.", cta: "Ver ofertas", href: `/catalogo?o=ofertas` },
]

export async function Home() {
  const catalog = await getCatalog();
  const { categories, products } = catalog;
  const look = ["polera-manga-larga-special", "jeans-wide-leg", "chaqueta-mezclilla-oversize", "bolso-tote"].flatMap((s) => findProduct(catalog, s) ?? []);
  // Siempre 8 (dos filas completas): primero todo lo marcado "nuevo", luego lo de mujer,
  // luego lo destacado, y se completa con el resto del catálogo.
  const rank = (p: (typeof products)[number]) => (p.badge === "nuevo" ? 0 : p.line === "mujer" ? 1 : p.featured ? 2 : 3);
  const fresh = [...products].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
  const sale = products.filter((p) => p.compareAtPrice);

  const show = sectionVisible((await getCatalog()).store);
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
            slides={slides.map((s, k) => (
              <div key={s.title} className={`grid h-full gap-6 rounded-brand p-4 md:min-h-[600px] md:grid-cols-2 md:p-6 ${s.bg}`}>
                <div className="slide-text flex flex-col justify-center gap-6 p-4 pb-2 md:p-8">
                  <h1 className="text-[clamp(3rem,6.4vw,6.8rem)] font-display font-normal leading-[0.92] tracking-[-0.02em]">{s.title}</h1>
                  <p className="max-w-md text-xl leading-relaxed">{s.text}</p>
                  <Link href={s.href} className="w-fit rounded-full bg-ink px-8 py-4 text-lg font-semibold text-bg transition-transform hover:-translate-y-0.5 active:scale-95">{s.cta}</Link>
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
            <h2 className="text-5xl font-display font-normal leading-[0.95] tracking-[-0.02em] md:text-7xl">¡Llegó lo nuevo!</h2>
            <Link href={`/catalogo?o=nuevos`} className="rounded-full bg-surface px-6 py-3 text-lg font-semibold transition-colors hover:bg-field">Ver todo</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {fresh.map((p, k) => <Reveal key={p.slug} delay={(k % 4) * 70}><Card p={p} /></Reveal>)}
          </div>
        </section>
        </>
      )}

      {/* Compra el look */}
      {show("look") && (
        <>
        {look.length > 0 && (
          <section className="mx-auto mt-24 grid w-full max-w-[1440px] gap-4 rounded-brand bg-surface p-4 md:p-6 lg:grid-cols-[7fr_5fr]">
            <Reveal>
              <Photo name="woman2" alt="Look con jeans wide leg y polera manga larga" sizes="(max-width: 1024px) 100vw, 60vw" className="aspect-[4/5] rounded-[calc(var(--radius)-8px)] lg:aspect-[5/6]" />
            </Reveal>
            <Reveal delay={120} className="flex flex-col gap-8 p-2 md:p-6 lg:py-10">
              <h2 className="text-5xl font-display font-normal leading-[0.95] tracking-[-0.02em] md:text-7xl">Compra el look</h2>
              <p className="max-w-md text-xl leading-relaxed">Jeans wide leg, polera ajustada y tote: un look fácil para todos los días. Marca lo que te falta y agrégalo junto, en tu talla.</p>
              <ShopTheLook slugs={look.map((p) => p.slug)} />
            </Reveal>
          </section>
        )}
        </>
      )}

      {/* Banner de ofertas */}
      {show("sale") && (
        <>
        <Reveal as="section" className="mx-auto mt-24 grid w-full max-w-[1440px] gap-4 rounded-brand bg-[var(--field-2)] p-4 md:grid-cols-[1fr_2fr] md:p-6">
          <div className="flex flex-col justify-between gap-8 p-4 md:p-6">
            <h2 className="text-5xl font-display font-normal leading-[0.95] tracking-[-0.02em] md:text-7xl">Hasta 33% off</h2>
            <p className="text-xl">Vestidos, poleras y básicos con precio rebajado mientras dure el stock.</p>
            <Link href={`/catalogo?o=ofertas`} className="w-fit rounded-full bg-ink px-8 py-4 text-lg font-semibold text-bg transition-transform hover:-translate-y-0.5 active:scale-95">Ver todas las ofertas</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {sale.slice(0, 3).map((p) => <Card key={p.slug} p={p} />)}
          </div>
        </Reveal>
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
              <h3 className="font-display text-4xl">{t}</h3>
              <p className="text-lg leading-relaxed">{d}</p>
            </Reveal>
          ))}
        </section>
        </>
      )}
    </div>
  );
}
