import type { ThemeDefinition } from "../registry";
import { Layout } from "./Layout";
import { Home } from "./Home";
import { Catalog } from "./Catalog";
import { Product } from "./Product";
import { Cart } from "./Cart";

export const theme: ThemeDefinition = {
  id: "vitrina",
  name: "Vitrina",
  description: "Streetwear de drops: tipografía condensada enorme, cuenta regresiva y sale.",
  defaults: {
    colors: { bg: "#ffffff", ink: "#0b0b0b", surface: "#eeeeec", accent: "#e8361f", field: "#0b0b0b", field2: "#eeeeec" },
    fonts: { display: "archivo", body: "archivo" },
    radius: 0,
  },
  Layout,
  Home,
  Catalog,
  Product,
  Cart,
};
