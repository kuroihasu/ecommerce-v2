// Carrusel de la portada. Cada diseño trae sus banners de ejemplo; desde el panel
// (Avanzado > Carrusel de la portada) la tienda puede escribir los suyos y elegir el
// ritmo. Se guarda en settings.hero; sin banners propios se usan los del diseño.
export type HeroSlide = {
  // URL https de la foto o una clave de las fotos de muestra (ver designs/images.ts).
  image: string;
  title: string;
  text: string;
  // Etiqueta corta sobre el título ("Edición limitada"). Vacía = sin etiqueta.
  tag: string;
  cta: string;
  // Ruta de la tienda (/catalogo?o=ofertas) o una dirección https.
  href: string;
};
export type HeroConfig = { autoplay: boolean; seconds: number; slides: HeroSlide[] };

export const HERO_MAX = 6;
export const heroDefaults = { autoplay: true, seconds: 6 };

export const defaultSlides: Record<string, HeroSlide[]> = {
  atelier: [
    { image: "editorial", title: "Colección Invierno", text: "Lana, mezclilla y negro. Ya disponible.", tag: "", cta: "Ver la colección", href: "/catalogo?o=nuevos" },
    { image: "dress", title: "Vestidos para salir", text: "Satinados y florales desde $24.990.", tag: "", cta: "Ver vestidos", href: "/catalogo?c=vestidos" },
    { image: "rack", title: "Hasta 30% en básicos", text: "Poleras y polerones con precio de temporada.", tag: "", cta: "Ver ofertas", href: "/catalogo?o=ofertas" },
  ],
  vitrina: [
    { image: "streetwear", title: "Drop 026 ya disponible", text: "", tag: "Edición limitada", cta: "Comprar el drop", href: "/catalogo?o=nuevos" },
    { image: "hoodie2", title: "Preventa Zip Logo 3D", text: "", tag: "Despacho 25/11", cta: "Reservar el mío", href: "/producto/poleron-zip-logo" },
    { image: "street2", title: "Sale hasta 33% off", text: "", tag: "Hasta agotar stock", cta: "Ver el sale", href: "/catalogo?o=ofertas" },
  ],
  plaza: [
    { image: "woman3", title: "Nueva colección mujer", text: "Vestidos, jeans wide leg y básicos suaves para armar tus looks de temporada.", tag: "", cta: "Ver lo nuevo", href: "/catalogo?o=nuevos" },
    { image: "dress2", title: "Vestidos para cada ocasión", text: "Satinados, florales y midi. Desde $24.990.", tag: "", cta: "Ver vestidos", href: "/catalogo?c=vestidos" },
    { image: "woman2", title: "Ofertas de la semana", text: "Hasta 33% off en prendas seleccionadas. Solo hasta el domingo.", tag: "", cta: "Ver ofertas", href: "/catalogo?o=ofertas" },
  ],
  mercado: [
    { image: "woman", title: "Lo nuevo de la temporada", text: "Vestidos, jeans wide leg y básicos que combinan con todo.", tag: "", cta: "Ver lo nuevo", href: "/catalogo?o=nuevos" },
    { image: "dress2", title: "Ofertas de la semana", text: "Hasta 33% off en prendas seleccionadas. Solo hasta el domingo.", tag: "", cta: "Ver ofertas", href: "/catalogo?o=ofertas" },
    { image: "hoodie", title: "Polerones para el frío", text: "Oversize, perchados y en tres colores. Desde $44.990.", tag: "", cta: "Ver polerones", href: "/catalogo?c=polerones" },
  ],
};

// Banners y ritmo finales para un diseño.
export function storeHero(store: { hero?: Partial<HeroConfig> | null }, theme: string) {
  const h = store.hero ?? {};
  const slides = h.slides?.length ? h.slides : (defaultSlides[theme] ?? defaultSlides.atelier);
  const seconds = Math.min(15, Math.max(3, h.seconds ?? heroDefaults.seconds));
  return { slides, autoplay: h.autoplay ?? heroDefaults.autoplay, interval: seconds * 1000 };
}

export const isExternal = (href: string) => /^https:\/\//.test(href);
