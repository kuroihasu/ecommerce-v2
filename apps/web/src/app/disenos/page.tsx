import Link from "next/link";

const options = [
  {
    href: "/disenos/taller",
    name: "A · Taller",
    mood: "Editorial y sereno",
    text: "Serif grande, mucho aire, verde bosque. Se siente como una revista de diseño o una tienda de autor. Ideal para marcas que venden calidad y origen.",
    swatch: ["#f3f2ee", "#1b2420", "#2c4a3b"],
  },
  {
    href: "/disenos/vitrina",
    name: "B · Vitrina",
    mood: "Audaz y de alto contraste",
    text: "Tipografía condensada enorme, blanco y negro con rojo señal, fotos a sangre. Se siente como una marca de moda o un concept store.",
    swatch: ["#ffffff", "#0b0b0b", "#e8361f"],
  },
  {
    href: "/disenos/mercado",
    name: "C · Mercado",
    mood: "Cercano y colorido",
    text: "Campos de color, formas redondas y un buscador de regalos por presupuesto. Se siente amable y fácil, bueno para regalos y público amplio.",
    swatch: ["#f2b705", "#f6c9c1", "#0f4c45"],
  },
];

export default function Disenos() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
      <h1 className="text-5xl font-semibold tracking-[-0.03em] md:text-7xl">Tres direcciones de diseño</h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed">
        La misma tienda de muestra (Lana &amp; Greda) en tres estilos. Cada una tiene inicio, catálogo, ficha de
        producto y carrito funcionando. Los colores y tipografías son tokens: cambiarlos por la marca de cada cliente
        es editar un bloque de variables.
      </p>
      <ul className="mt-16 flex flex-col gap-4">
        {options.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className="group grid gap-6 bg-[#f2f2f2] p-8 transition-colors hover:bg-[#e8e8e8] md:grid-cols-[1fr_2fr_auto] md:items-center">
              <div>
                <p className="text-3xl font-semibold">{o.name}</p>
                <p className="text-lg text-black/70">{o.mood}</p>
              </div>
              <p className="text-lg leading-relaxed">{o.text}</p>
              <div className="flex gap-2">
                {o.swatch.map((c) => (
                  <span key={c} className="h-12 w-12" style={{ background: c }} />
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
