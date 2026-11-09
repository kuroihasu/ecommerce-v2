import { fontOptions, type FontKey } from "./fontOptions";

// Lo que el cliente puede personalizar sobre cualquier tema. Se guarda en
// Store.theme (JSON) con esta forma:
// { "template": "atelier", "colors": { "accent": "#2c4a3b", ... }, "fonts": { "display": "playfair" }, "radius": 12 }
export type ColorKey = "bg" | "ink" | "surface" | "accent" | "field" | "field2";
export type ThemeTokens = {
  colors: Record<ColorKey, string>;
  fonts: { display: FontKey; body: FontKey };
  radius: number;
};
export type StoredTheme = {
  template?: string;
  colors?: Partial<Record<ColorKey, string>>;
  fonts?: Partial<ThemeTokens["fonts"]>;
  radius?: number;
};

export const colorLabels: Record<ColorKey, string> = {
  bg: "Fondo",
  ink: "Texto",
  surface: "Superficies (tarjetas, filtros)",
  accent: "Principal (botones)",
  field: "Bloques de color",
  field2: "Bloques secundarios",
};

const HEX = /^#[0-9a-f]{6}$/i;

// Mezcla lo guardado con los valores por defecto del tema, descartando lo inválido.
export function mergeTokens(defaults: ThemeTokens, stored: StoredTheme | null | undefined): ThemeTokens {
  const colors = { ...defaults.colors };
  for (const [k, v] of Object.entries(stored?.colors ?? {})) {
    if (k in colors && typeof v === "string" && HEX.test(v)) colors[k as ColorKey] = v;
  }
  const fonts = { ...defaults.fonts };
  for (const k of ["display", "body"] as const) {
    const f = stored?.fonts?.[k];
    if (f && f in fontOptions) fonts[k] = f as FontKey;
  }
  const r = stored?.radius;
  const radius = typeof r === "number" && r >= 0 && r <= 40 ? Math.round(r) : defaults.radius;
  return { colors, fonts, radius };
}

// Texto legible sobre un color: negro o blanco según su luminancia.
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.36 ? "#111111" : "#ffffff";
}

// Tokens → variables CSS que usa todo el front (ver globals.css).
export function tokensToCss(t: ThemeTokens): Record<string, string> {
  const c = t.colors;
  return {
    "--bg": c.bg,
    "--ink": c.ink,
    "--surface": c.surface,
    "--accent": c.accent,
    "--accent-ink": readableOn(c.accent),
    "--field": c.field,
    "--field-ink": readableOn(c.field),
    "--field-2": c.field2,
    "--radius": `${t.radius}px`,
    "--font-display": `var(${fontOptions[t.fonts.display].cssVar})`,
    "--font-body": `var(${fontOptions[t.fonts.body].cssVar})`,
  };
}
