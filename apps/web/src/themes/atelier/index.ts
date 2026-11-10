import type { ThemeDefinition } from "../registry";
import { Layout } from "./Layout";
import { Home } from "./Home";
import { Catalog } from "./Catalog";
import { Product } from "./Product";
import { Cart } from "./Cart";

export const theme: ThemeDefinition = {
  id: "atelier",
  name: "Atelier",
  description: "Boutique editorial: serif grande, carrusel a pantalla completa y \"compra el look\".",
  defaults: {
    colors: { bg: "#f3f2ee", ink: "#1b2420", surface: "#e6e4dd", accent: "#2c4a3b", field: "#2c4a3b", field2: "#e6e4dd" },
    fonts: { display: "instrument-serif", body: "hanken" },
    radius: 0,
  },
  sections: [
    { id: "hero", label: "Portada", hint: "Carrusel de campañas a pantalla completa." },
    { id: "lines", label: "Mujer / Hombre", hint: "Las dos fotos grandes que llevan a cada línea." },
    { id: "new", label: "Lo nuevo" },
    { id: "look", label: "Compra el look" },
    { id: "categories", label: "Por categoría", hint: "Franja horizontal con las categorías." },
    { id: "promise", label: "Envíos, cambios y cuotas", hint: "Los tres beneficios al final de la portada." },
  ],
  Layout,
  Home,
  Catalog,
  Product,
  Cart,
};
