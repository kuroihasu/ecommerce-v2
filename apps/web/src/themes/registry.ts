import type { ReactNode } from "react";
import type { ThemeTokens } from "./tokens";
import type { SectionDef } from "./sections";
import * as atelier from "./atelier";
import * as vitrina from "./vitrina";
import * as mercado from "./mercado";
import * as plaza from "./plaza";

// Un tema = las cinco piezas de la tienda + sus valores por defecto.
// Para agregar un diseño nuevo: crea src/themes/<id>/ con estas piezas y un
// index.ts que exporte `theme`, y súmalo a esta lista (ver README.md).
export type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  defaults: ThemeTokens;
  // Secciones de la portada que se pueden ocultar desde el panel (Avanzado).
  sections: SectionDef[];
  Layout: (p: { children: ReactNode }) => ReactNode;
  Home: () => ReactNode;
  Catalog: () => ReactNode;
  Product: (p: { slug: string }) => ReactNode;
  Cart: () => ReactNode;
};

export const themes: ThemeDefinition[] = [atelier.theme, vitrina.theme, mercado.theme, plaza.theme];
export const DEFAULT_THEME = "atelier";
export const getThemeDef = (id: string | undefined) => themes.find((t) => t.id === id) ?? themes.find((t) => t.id === DEFAULT_THEME)!;
