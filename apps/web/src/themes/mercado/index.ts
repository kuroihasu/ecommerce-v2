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
  Layout,
  Home,
  Catalog,
  Product,
  Cart,
};
