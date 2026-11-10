import type { ThemeDefinition } from "../registry";
import { Layout } from "./Layout";
import { Home } from "./Home";
import { Catalog } from "./Catalog";
import { Product } from "./Product";
import { Cart } from "./Cart";

export const theme: ThemeDefinition = {
  id: "plaza",
  name: "Plaza",
  description: "Moda mujer en tonos pastel rosados: serif elegante, formas redondas y un \"compra el look\".",
  defaults: {
    colors: { bg: "#fffafb", ink: "#4a2a3a", surface: "#fbeef2", accent: "#c95b85", field: "#f7d3df", field2: "#e9def7" },
    fonts: { display: "instrument-serif", body: "hanken" },
    radius: 28,
  },
  Layout,
  Home,
  Catalog,
  Product,
  Cart,
};
