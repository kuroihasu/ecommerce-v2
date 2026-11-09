// Catálogo de muestra para las previews de diseño. Es más amplio que el seed de la
// API (3 productos) para ver cada dirección con densidad real. Cuando se elija una
// dirección, estas páginas pasan a leer la API (lib/api.ts).

export type DemoVariant = { id: string; name: string; price: number; compareAtPrice?: number; stock: number };
export type DemoProduct = {
  slug: string;
  name: string;
  category: CategorySlug;
  short: string;
  description: string;
  details: string[];
  origin: string;
  image: string;
  gallery: string[];
  variants: DemoVariant[];
  featured?: boolean;
  isNew?: boolean;
};

export type CategorySlug = "ceramica" | "textil" | "velas" | "cocina";

export const store = {
  name: "Lana & Greda",
  tagline: "Objetos de hogar hechos a mano en Chile",
  email: "hola@lanaygreda.cl",
  instagram: "@lanaygreda",
  whatsapp: "+56 9 1234 5678",
  freeShippingFrom: 40000,
};

export const categories: { slug: CategorySlug; name: string; blurb: string; image: string }[] = [
  { slug: "ceramica", name: "Cerámica", blurb: "Gres y greda torneados a mano en Pomaire y Santiago.", image: "pottery" },
  { slug: "textil", name: "Textil", blurb: "Lana merino y alpaca hilada y tejida a telar en el sur.", image: "blanket" },
  { slug: "velas", name: "Velas y aromas", blurb: "Cera de soya y esencias de bosque nativo.", image: "candle" },
  { slug: "cocina", name: "Cocina", blurb: "Maderas nativas, lino y mimbre de Chimbarongo.", image: "board" },
];

const v = (slug: string, price: number, stock: number, names: string[] = ["Único"], compareAtPrice?: number) =>
  names.map((name, i) => ({ id: `${slug}-${i}`, name, price, stock, compareAtPrice }));

export const products: DemoProduct[] = [
  {
    slug: "taza-greda-negra",
    name: "Taza de greda negra",
    category: "ceramica",
    short: "Pulida a piedra, 300 ml",
    description:
      "Torneada y pulida a piedra, sin esmalte por fuera, con un interior vitrificado que aguanta el lavavajillas. Cada taza sale distinta del horno.",
    details: ["300 ml", "Apta para lavavajillas", "Interior esmaltado sin plomo", "Hecha en Quinchamalí"],
    origin: "Quinchamalí, Ñuble",
    image: "mug",
    gallery: ["mug", "mug2", "pottery"],
    variants: v("taza-greda-negra", 12990, 25, ["Negra", "Natural"]),
    featured: true,
  },
  {
    slug: "set-platos-hondos",
    name: "Set de 2 platos hondos",
    category: "ceramica",
    short: "Gres esmaltado, 20 cm",
    description:
      "Platos hondos de gres con esmalte mate en dos tonos. Pensados para la sopa de todos los días y para que no se vean de serie.",
    details: ["20 cm de diámetro", "Set de 2", "Apto para microondas", "Esmalte mate"],
    origin: "Pomaire, Región Metropolitana",
    image: "bowls",
    gallery: ["bowls", "plates", "pottery"],
    variants: v("set-platos-hondos", 24990, 14, ["Arena", "Musgo", "Carbón"]),
    featured: true,
  },
  {
    slug: "jarro-ceramica-blanca",
    name: "Jarro de cerámica blanca",
    category: "ceramica",
    short: "1 litro, para agua o flores",
    description: "Un jarro de un litro con asa ancha y pico que no gotea. Sirve en la mesa y como florero.",
    details: ["1 litro", "28 cm de alto", "Esmalte brillante"],
    origin: "Santiago",
    image: "vase",
    gallery: ["vase", "pottery"],
    variants: v("jarro-ceramica-blanca", 18990, 9),
    isNew: true,
  },
  {
    slug: "manta-lana-merino",
    name: "Manta de lana merino",
    category: "textil",
    short: "Tejida a telar, 130 × 180 cm",
    description:
      "Lana merino de Magallanes, hilada y tejida a telar en Chiloé. Abriga sin pesar y se lava a mano con agua fría.",
    details: ["130 × 180 cm", "100% lana merino", "Lavar a mano", "Tejida en Chiloé"],
    origin: "Chiloé, Los Lagos",
    image: "blanket",
    gallery: ["blanket", "blanket2", "wool"],
    variants: v("manta-lana-merino", 49990, 8, ["Natural", "Gris piedra", "Musgo"]),
    featured: true,
  },
  {
    slug: "pie-de-cama-alpaca",
    name: "Pie de cama de alpaca",
    category: "textil",
    short: "Alpaca y lana, 70 × 220 cm",
    description: "Un pie de cama tupido de alpaca con lana de oveja, con flecos anudados a mano.",
    details: ["70 × 220 cm", "60% alpaca, 40% lana", "Flecos anudados a mano"],
    origin: "Putre, Arica y Parinacota",
    image: "blanket2",
    gallery: ["blanket2", "wool"],
    variants: v("pie-de-cama-alpaca", 64990, 4, ["Crudo", "Café"], 74990),
  },
  {
    slug: "cojin-telar",
    name: "Cojín tejido a telar",
    category: "textil",
    short: "45 × 45 cm, con relleno",
    description: "Funda de lana tejida a telar con relleno de pluma sintética. La funda se retira con un cierre oculto.",
    details: ["45 × 45 cm", "Funda de lana", "Relleno incluido"],
    origin: "Temuco, La Araucanía",
    image: "cushion",
    gallery: ["cushion", "wool"],
    variants: v("cojin-telar", 22990, 18, ["Crudo", "Terracota", "Gris"]),
    isNew: true,
  },
  {
    slug: "vela-soya-cedro",
    name: "Vela de soya aroma cedro",
    category: "velas",
    short: "Mecha de algodón, 45 horas",
    description: "Cera de soya vertida a mano en vaso de vidrio reciclado, con aroma a cedro y vetiver. Dura unas 45 horas.",
    details: ["220 g", "45 horas de duración", "Mecha de algodón", "Vaso reutilizable"],
    origin: "Valparaíso",
    image: "candle",
    gallery: ["candle", "candle2"],
    variants: v("vela-soya-cedro", 9990, 40),
    featured: true,
  },
  {
    slug: "vela-bosque-valdiviano",
    name: "Vela Bosque Valdiviano",
    category: "velas",
    short: "Ulmo, musgo y lluvia",
    description: "Notas de miel de ulmo, musgo húmedo y tierra mojada. Hecha en pequeños lotes de 60 velas.",
    details: ["220 g", "45 horas", "Lotes de 60 unidades"],
    origin: "Valdivia, Los Ríos",
    image: "candle2",
    gallery: ["candle2", "candle"],
    variants: v("vela-bosque-valdiviano", 11990, 22),
  },
  {
    slug: "difusor-palo-santo",
    name: "Difusor de palo santo",
    category: "velas",
    short: "Varillas de ratán, 100 ml",
    description: "Difusor de ambiente con base de aceites vegetales y aroma a palo santo. Perfuma un cuarto por dos meses.",
    details: ["100 ml", "8 varillas de ratán", "Dura unos 2 meses"],
    origin: "Santiago",
    image: "diffuser",
    gallery: ["diffuser", "candle"],
    variants: v("difusor-palo-santo", 14990, 16),
  },
  {
    slug: "canasto-mimbre",
    name: "Canasto de mimbre",
    category: "cocina",
    short: "Tejido en Chimbarongo",
    description: "Canasto de mimbre tejido a mano en Chimbarongo, para el pan, la fruta o la leña chica.",
    details: ["35 cm de diámetro", "Mimbre natural", "Tejido a mano"],
    origin: "Chimbarongo, O'Higgins",
    image: "basket",
    gallery: ["basket"],
    variants: v("canasto-mimbre", 27990, 11, ["Mediano", "Grande"]),
    featured: true,
  },
  {
    slug: "tabla-rauli",
    name: "Tabla de raulí",
    category: "cocina",
    short: "Madera nativa certificada",
    description: "Tabla para picar y servir de raulí de manejo certificado, terminada con aceite de linaza.",
    details: ["40 × 22 cm", "Raulí certificado", "Aceite de linaza"],
    origin: "Panguipulli, Los Ríos",
    image: "board",
    gallery: ["board"],
    variants: v("tabla-rauli", 19990, 13),
  },
  {
    slug: "pano-lino",
    name: "Paño de cocina de lino",
    category: "cocina",
    short: "Set de 2, 50 × 70 cm",
    description: "Paños de lino lavado que secan rápido y se ponen más suaves con cada lavado.",
    details: ["Set de 2", "50 × 70 cm", "100% lino lavado"],
    origin: "Santiago",
    image: "linen",
    gallery: ["linen"],
    variants: v("pano-lino", 8990, 30, ["Natural", "Rayado"]),
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const categoryName = (slug: CategorySlug) => categories.find((c) => c.slug === slug)?.name ?? slug;
export const fromPrice = (p: DemoProduct) => Math.min(...p.variants.map((x) => x.price));

export const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
