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
  Layout,
  Home,
  Catalog,
  Product,
  Cart,
};
