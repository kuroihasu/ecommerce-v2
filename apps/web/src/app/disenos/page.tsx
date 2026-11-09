
const options = [
  {
    href: "/tema/atelier",
    name: "A · Atelier",
    mood: "Boutique editorial",
    text: "Serif grande, carrusel a pantalla completa, fotos que cambian al pasar el mouse y un \"compra el look\" que agrega varias prendas de una vez. Para marcas de moda que quieren verse premium.",
    swatch: ["#f3f2ee", "#1b2420", "#2c4a3b"],
  },
  {
    href: "/tema/vitrina",
    name: "B · Vitrina",
    mood: "Streetwear de drops",
    text: "Tipografía condensada enorme, negro con rojo, cuenta regresiva al próximo drop, preventas y sale. Al estilo de las marcas urbanas que lanzan ediciones limitadas.",
    swatch: ["#ffffff", "#0b0b0b", "#e8361f"],
  },
  {
    href: "/tema/mercado",
    name: "C · Mercado",
    mood: "Moda de temporada",
    text: "Campos de color, todo redondeado, categorías en burbujas, banner de ofertas y un buscador por precio. Cercana y fácil, para tiendas de tendencia con público amplio.",
    swatch: ["#f2b705", "#f6c9c1", "#0f4c45"],
  },
];

export default function Disenos() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
      <h1 className="text-5xl font-semibold tracking-[-0.03em] md:text-7xl">Tres direcciones de diseño</h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed">
        La misma tienda de ropa de muestra (NORTE) en tres estilos. Cada una tiene inicio, catálogo, ficha de
        producto y carrito funcionando. Es una sola tienda: el diseño, los colores, las tipografías y los bordes se eligen
        con el botón Personalizar (después, desde el panel de administración).
      </p>
      <ul className="mt-16 flex flex-col gap-4">
        {options.map((o) => (
          <li key={o.href}>
            <a href={o.href} className="group grid gap-6 bg-[#f2f2f2] p-8 transition-colors hover:bg-[#e8e8e8] md:grid-cols-[1fr_2fr_auto] md:items-center">
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
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
