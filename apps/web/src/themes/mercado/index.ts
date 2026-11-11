import type { ThemeDefinition } from "../registry";
import { Layout } from "./Layout";
import { Home } from "./Home";
import { Catalog } from "./Catalog";
import { Product } from "./Product";
import { Cart } from "./Cart";

export const theme: ThemeDefinition = {
  id: "mercado",
  name: "Mercado",
  description: "Moda de temporada: campos de color, formas redondas y buscador por precio.",
  defaults: {
    colors: { bg: "#ffffff", ink: "#12302b", surface: "#f1efe9", accent: "#0f4c45", field: "#f2b705", field2: "#f6c9c1" },
    fonts: { display: "bricolage", body: "bricolage" },
    radius: 28,
  },
  sections: [
    { id: "hero", label: "Portada", hint: "Carrusel de campañas." },
    { id: "categories", label: "Categorías en burbujas" },
    { id: "new", label: "¡Llegó lo nuevo!" },
    { id: "sale", label: "Banner de ofertas" },
    { id: "giftfinder", label: "Buscador por precio", hint: "\"¿Cuánto quieres gastar?\"" },
    { id: "promise", label: "Envíos, cambios y cuotas" },
  ],
  Layout,
  Home,
  Catalog,
  Product,
  Cart,
};
