import { cookies } from "next/headers";
import { cache } from "react";
import { getStoreData } from "@/lib/catalog";
import { getThemeDef } from "./registry";
import { mergeTokens, type StoredTheme } from "./tokens";

export const PREVIEW_COOKIE = "theme-preview";
export function parsePreview(raw: string | undefined): StoredTheme | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    return v && typeof v === "object" ? (v as StoredTheme) : null;
  } catch {
    return null;
  }
}

// Tema activo de la tienda: el de la base, con la vista previa del personalizador encima.
export const getActiveTheme = cache(async () => {
  // Tema guardado en la base (Store.theme), que llega junto con el catálogo.
  const stored = (await getStoreData()).theme;
  const preview = parsePreview((await cookies()).get(PREVIEW_COOKIE)?.value);
  const template = preview?.template ?? stored?.template;
  const def = getThemeDef(template);
  // Si la vista previa cambió de diseño, se parte de los colores de ese diseño.
  const base = preview?.template && preview.template !== stored?.template ? null : stored;
  const overrides: StoredTheme = {
    colors: { ...base?.colors, ...preview?.colors },
    fonts: { ...base?.fonts, ...preview?.fonts },
    radius: preview?.radius ?? base?.radius,
  };
  return { def, tokens: mergeTokens(def.defaults, overrides), preview };
});
