import Link from "next/link";
import { findProduct } from "@/designs/catalog";
import { getCatalog } from "@/lib/catalog";
import { Photo } from "@/designs/Photo";
import { Carousel } from "@/designs/Carousel";
import { Reveal } from "@/designs/Reveal";
import { Card } from "./Card";
import { ShopTheLook } from "./ShopTheLook";


const slides = [
  { image: "editorial", title: "Colección Invierno", text: "Lana, mezclilla y negro. Ya disponible.", cta: "Ver la colección", href: `/catalogo?o=nuevos` },
  { image: "dress", title: "Vestidos para salir", text: "Satinados y florales desde $24.990.", cta: "Ver vestidos", href: `/catalogo?c=vestidos` },
  { image: "rack", title: "Hasta 30% en básicos", text: "Poleras y polerones con precio de temporada.", cta: "Ver ofertas", href: `/catalogo?o=ofertas` },
];

export async function Home() {
  const catalog = await getCatalog();
  const { categories, lines, products } = catalog;
  const fresh = products.filter((p) => p.featured).slice(0, 4);
  const look = ["chaqueta-mezclilla-oversize", "polera-boxy-heavy", "jeans-wide-leg", "bolso-tote"].flatMap((s) => findProduct(catalog, s) ?? []);

  return (
    <>
      {/* Portada: carrusel a pantalla completa */}
      <Carousel
        label="Campañas"
        className="h-[78vh] min-h-[520px]"
        slides={slides.map((s, k) => (
          <div key={s.title} className="relative h-full">
            <Photo name={s.image} alt={s.title} priority={k === 0} sizes="100vw" className="slide-media absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent)]" />
            <div className="slide-text absolute bottom-0 left-0 flex max-w-3xl flex-col items-start gap-5 p-6 pb-24 text-white sm:p-10 sm:pb-24">
              <h2 className="font-display text-[clamp(3.2rem,8vw,8rem)] leading-[0.9] tracking-[-0.02em]">{s.title}</h2>
              <p className="text-xl">{s.text}</p>
              <Link href={s.href} className="bg-white px-8 py-4 text-lg text-black transition-transform hover:-translate-y-0.5 active:scale-[0.98]">{s.cta}</Link>
            </div>
          </div>
        ))}
      />

      {/* Mujer / Hombre */}
      <section className="mx-auto mt-6 grid max-w-[1440px] grid-cols-2 gap-4 px-5 sm:px-8">
        {lines.map((l, k) => (
          <Reveal key={l.slug} delay={k * 90}>
            <Link href={`/catalogo?l=${l.slug}`} className="group relative block">
              <Photo name={l.image} alt={l.name} sizes="50vw" className="aspect-[4/5] md:aspect-[16/10] [&_img]:transition-transform [&_img]:duration-1000 group-hover:[&_img]:scale-105" />
              <span className="absolute bottom-0 left-0 bg-bg px-5 py-3 font-display text-3xl transition-[padding] group-hover:pr-10 md:text-5xl">{l.name}</span>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* Lo nuevo */}
      <section className="mx-auto mt-36 max-w-[1440px] px-5 sm:px-8">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-6xl leading-none tracking-[-0.02em] md:text-7xl">Lo nuevo</h2>
          <Link href={`/catalogo?o=nuevos`} className="text-lg underline underline-offset-4">Ver todo</Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {fresh.map((p, k) => (
            <Reveal key={p.slug} delay={k * 80}><Card p={p} /></Reveal>
          ))}
        </div>
      </section>

      {/* Compra el look: lo único "vivo" de la portada */}
      {look.length > 0 && (
      <section className="mt-36 bg-surface py-24">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[7fr_5fr]">
          <Reveal>
            <Photo name="editorial2" alt="Look de mezclilla con polera blanca" sizes="60vw" className="aspect-[4/5] lg:aspect-[5/6]" />
          </Reveal>
          <Reveal delay={120} className="flex flex-col gap-8 lg:py-10">
            <h2 className="font-display text-6xl leading-none tracking-[-0.02em] md:text-7xl">Compra el look</h2>
            <p className="max-w-md text-xl leading-relaxed">Mezclilla clara con básicos. Marca lo que te falta y agrégalo todo junto, en tu talla.</p>
            <ShopTheLook slugs={look.map((p) => p.slug)} />
          </Reveal>
        </div>
      </section>
      )}

      {/* Categorías: franja horizontal */}
      <section className="mt-36">
        <Reveal className="mx-auto mb-10 max-w-[1440px] px-5 sm:px-8">
          <h2 className="font-display text-6xl leading-none tracking-[-0.02em] md:text-7xl">Por categoría</h2>
        </Reveal>
        <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:px-8">
          {categories.map((c, k) => (
            <Reveal key={c.slug} delay={k * 60} className="w-[64vw] shrink-0 snap-start sm:w-[34vw] lg:w-[22vw]">
              <Link href={`/catalogo?c=${c.slug}`} className="group flex flex-col gap-3">
                <Photo name={c.image} alt={c.name} sizes="30vw" className="aspect-[3/4] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
                <span className="font-display text-3xl">{c.name}</span>
                <span className="-mt-2 text-base text-ink/75">{c.blurb}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Promesa */}
      <section className="mx-auto mt-36 grid max-w-[1440px] gap-10 px-5 sm:px-8 md:grid-cols-3">
        {[
          ["Envío a todo Chile", "RM $3.500 y regiones $5.990. Gratis sobre $60.000, en 2 a 5 días hábiles."],
          ["Cambios en 30 días", "Si la talla no te queda, la cambias gratis. Sin preguntas."],
          ["6 cuotas sin interés", "Con Mercado Pago, o 3 cuotas con Venti. También Webpay."],
        ].map(([t, d], k) => (
          <Reveal key={t} delay={k * 90} className="flex flex-col gap-3">
            <h3 className="font-display text-4xl leading-tight">{t}</h3>
            <p className="text-lg leading-relaxed">{d}</p>
          </Reveal>
        ))}
      </section>
    </>
  );
}
