import Link from "next/link";
import { categories, products } from "@/designs/catalog";
import { Photo } from "@/designs/Photo";
import { Card } from "./Card";
import { GiftFinder } from "./GiftFinder";

const B = "/disenos/mercado";
const fields = ["bg-field", "bg-[var(--field-2)]", "bg-accent text-accent-ink", "bg-surface"];

export default function MercadoHome() {
  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6">
      {/* Portada: campo amarillo con foto redondeada */}
      <section className="mx-auto grid w-full max-w-[1440px] gap-6 rounded-brand bg-field p-4 text-field-ink md:grid-cols-2 md:p-6">
        <div className="flex flex-col justify-between gap-10 p-4 md:p-8">
          <h1 className="rise text-[clamp(3.2rem,6.6vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
            Regalos hechos a mano en Chile
          </h1>
          <div className="rise rise-1 flex flex-col gap-6">
            <p className="max-w-md text-xl leading-relaxed">Cerámica, mantas y velas de talleres de todo el país. Desde $8.990, con despacho gratis sobre $40.000.</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`${B}/catalogo`} className="rounded-full bg-accent px-8 py-4 text-lg font-semibold text-accent-ink transition-transform active:scale-95">Ver el catálogo</Link>
              <Link href="#regalos" className="rounded-full bg-bg px-8 py-4 text-lg font-semibold transition-transform active:scale-95">Buscar un regalo</Link>
            </div>
          </div>
        </div>
        <Photo name="table" alt="Mesa puesta con cerámica" priority sizes="(max-width: 768px) 100vw, 50vw" className="drift rise rise-1 aspect-[4/5] rounded-[calc(var(--radius)-8px)] md:aspect-auto md:min-h-[560px]" />
      </section>

      {/* Categorías: cuatro bloques de color */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((c, i) => (
          <Link key={c.slug} href={`${B}/catalogo?c=${c.slug}`} className={`group flex flex-col gap-4 rounded-brand p-4 transition-transform hover:-translate-y-1 ${fields[i]}`}>
            <Photo name={c.image} alt={c.name} sizes="25vw" className="aspect-square rounded-[calc(var(--radius)-10px)]" />
            <span className="px-2 text-2xl font-bold tracking-[-0.02em] md:text-3xl">{c.name}</span>
            <span className="hidden px-2 pb-2 text-base md:block">{c.blurb}</span>
          </Link>
        ))}
      </section>

      {/* Buscador de regalos: campo rosado */}
      <section id="regalos" className="mx-auto mt-28 w-full max-w-[1440px] scroll-mt-24 rounded-brand bg-[var(--field-2)] px-6 py-14 md:px-12">
        <h2 className="mb-8 text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">¿Cuánto quieres gastar?</h2>
        <GiftFinder />
      </section>

      {/* Destacados */}
      <section className="mx-auto mt-28 w-full max-w-[1440px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">Favoritos de la casa</h2>
          <Link href={`${B}/catalogo`} className="rounded-full bg-surface px-6 py-3 text-lg font-semibold">Ver todo</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {products.filter((p) => p.featured).slice(0, 4).map((p) => <Card key={p.slug} p={p} />)}
        </div>
      </section>

      {/* Promesa: foto + tres respuestas */}
      <section className="mx-auto mt-28 grid w-full max-w-[1440px] gap-4 md:grid-cols-2">
        <Photo name="hands" alt="Manos torneando greda" sizes="50vw" className="aspect-square rounded-brand" />
        <div className="flex flex-col justify-center gap-10 rounded-brand bg-surface p-8 md:p-12">
          {[
            ["Llega en 2 a 5 días", "Despachamos a todo Chile con Starken y Chilexpress. Gratis sobre $40.000."],
            ["Envuelto para regalo", "Sin costo y con una tarjeta escrita a mano, si nos dices para quién es."],
            ["Cambias si no te gusta", "Tienes 30 días para cambiar o devolver, sin preguntas."],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2">
              <h3 className="text-3xl font-bold tracking-[-0.02em]">{t}</h3>
              <p className="text-lg leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
