import type { ThemeDefinition } from "../registry";
import { Layout } from "./Layout";
import { Home } from "./Home";
import { Catalog } from "./Catalog";
import { Product } from "./Product";
import { Cart } from "./Cart";

export const theme: ThemeDefinition = {
  id: "plaza",
  name: "Plaza",
  description: "Campos de color y formas redondas, con colores en la ficha y un \"compra el look\".",
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
