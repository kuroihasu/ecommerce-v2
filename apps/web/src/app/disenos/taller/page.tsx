import Link from "next/link";
import { categories, formatCLP, fromPrice, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";

const B = "/disenos/taller";

// Orden de norte a sur según el taller de origen.
const latitude: Record<string, number> = {
  "Putre, Arica y Parinacota": -18.2,
  Santiago: -33.4,
  "Pomaire, Región Metropolitana": -33.6,
  Valparaíso: -33.0,
  "Chimbarongo, O'Higgins": -34.7,
  "Quinchamalí, Ñuble": -36.7,
  "Temuco, La Araucanía": -38.7,
  "Panguipulli, Los Ríos": -39.6,
  "Valdivia, Los Ríos": -39.8,
  "Chiloé, Los Lagos": -42.6,
};

export default function TallerHome() {
  const featured = products.filter((p) => p.featured);
  const route = [...products].sort((a, b) => (latitude[b.origin] ?? 0) - (latitude[a.origin] ?? 0));

  return (
    <>
      {/* Portada: titular enorme a la izquierda, foto a sangre a la derecha */}
      <section className="mx-auto grid max-w-[1440px] gap-8 px-5 pt-6 sm:px-8 lg:min-h-[calc(100vh-120px)] lg:grid-cols-[5fr_7fr]">
        <div className="flex flex-col justify-end gap-8 pb-4 lg:pb-16">
          <h1 className="rise font-display text-[clamp(3.5rem,8vw,8.5rem)] leading-[0.92] tracking-[-0.03em]">
            Hecho a mano, de Putre a Chiloé
          </h1>
          <p className="rise rise-1 max-w-md text-xl leading-relaxed">
            Cerámica, lana y velas de diez talleres chilenos. Cada pieza dice quién la hizo y dónde.
          </p>
          <div className="rise rise-2 flex flex-wrap items-center gap-6">
            <Link href={`${B}/catalogo`} className="bg-accent px-8 py-4 text-lg text-accent-ink transition-transform active:scale-[0.98]">
              Ver el catálogo
            </Link>
            <Link href="#origen" className="text-lg underline underline-offset-4">Conocer los talleres</Link>
          </div>
        </div>
        <Photo name="room" alt="Living con mantas y cerámica" priority sizes="(max-width: 1024px) 100vw, 60vw" className="drift rise rise-1 aspect-[4/5] lg:aspect-auto" />
      </section>

      {/* Destacados: rejilla asimétrica, una pieza grande y tres chicas */}
      <section className="mx-auto mt-40 max-w-[1440px] px-5 sm:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-6xl leading-none tracking-[-0.02em] md:text-7xl">Lo que más se lleva</h2>
          <Link href={`${B}/catalogo`} className="text-lg underline underline-offset-4">Ver todo</Link>
        </div>
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 5).map((p, i) => (
            <Link key={p.slug} href={`${B}/producto/${p.slug}`} className={`group flex flex-col gap-4 ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
              <Photo name={p.image} alt={p.name} sizes={i === 0 ? "50vw" : "25vw"} className={`${i === 0 ? "aspect-[4/5]" : "aspect-square"} [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105`} />
              <div className="flex items-baseline justify-between gap-4">
                <span className={i === 0 ? "font-display text-4xl leading-tight" : "text-lg"}>{p.name}</span>
                <span className="text-lg tabular-nums">{formatCLP(fromPrice(p))}</span>
              </div>
              <span className="-mt-3 text-base text-ink/70">{p.origin}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Origen: el recorrido de norte a sur, cada fila es un producto con su pueblo */}
      <section id="origen" className="mt-40 bg-surface py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[4fr_8fr]">
          <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:h-fit">
            <h2 className="font-display text-6xl leading-none tracking-[-0.02em] md:text-7xl">De norte a sur</h2>
            <p className="max-w-sm text-xl leading-relaxed">
              El catálogo ordenado por dónde se hace cada pieza, desde el altiplano hasta Chiloé.
            </p>
            <Photo name="hands" alt="Manos torneando greda" sizes="30vw" className="mt-4 hidden aspect-[4/3] lg:block" />
          </div>
          <ol className="flex flex-col">
            {route.map((p) => (
              <li key={p.slug}>
                <Link href={`${B}/producto/${p.slug}`} className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 transition-colors sm:grid-cols-[220px_1fr_auto]">
                  <span className="text-base text-ink/70 sm:text-lg">{p.origin}</span>
                  <span className="order-first col-span-2 font-display text-4xl leading-tight transition-transform duration-300 group-hover:translate-x-2 sm:order-none sm:col-span-1">{p.name}</span>
                  <span className="text-lg tabular-nums">{formatCLP(fromPrice(p))}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categorías: dos grandes, dos chicas, alternadas */}
      <section className="mx-auto mt-40 grid max-w-[1440px] items-start gap-x-8 gap-y-16 px-5 sm:px-8 md:grid-cols-12">
        {categories.map((c, i) => (
          <Link
            key={c.slug}
            href={`${B}/catalogo#${c.slug}`}
            className={`group flex flex-col gap-4 ${["md:col-span-7", "md:col-span-5 md:mt-32", "md:col-span-5", "md:col-span-7"][i]}`}
          >
            <Photo name={c.image} alt={c.name} sizes="60vw" className={`${i % 3 === 0 ? "aspect-[4/3]" : "aspect-[4/5]"} [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105`} />
            <span className="font-display text-5xl leading-none">{c.name}</span>
            <span className="max-w-sm text-lg text-ink/80">{c.blurb}</span>
          </Link>
        ))}
      </section>

      {/* Compromiso: campo verde con la promesa de servicio */}
      <section className="mx-auto mt-40 grid max-w-[1440px] gap-10 px-5 sm:px-8 md:grid-cols-3">
        {[
          ["Despacho a todo Chile", "Gratis sobre $40.000. Llega en 2 a 5 días hábiles con Starken o Chilexpress."],
          ["Cambios en 30 días", "Si no te convence, lo devuelves sin costo y te reembolsamos completo."],
          ["Pago seguro", "Webpay, Mercado Pago o transferencia. Boleta electrónica en tu correo."],
        ].map(([t, d]) => (
          <div key={t} className="flex flex-col gap-3">
            <h3 className="font-display text-4xl leading-tight">{t}</h3>
            <p className="text-lg leading-relaxed">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
