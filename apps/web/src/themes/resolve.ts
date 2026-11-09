import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { getThemeDef } from "./registry";
import { mergeTokens, type StoredTheme } from "./tokens";

export const PREVIEW_COOKIE = "theme-preview";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const STORE_SLUG = process.env.STORE_SLUG ?? "demo";

// Tema guardado en la base (Store.theme). Se cachea; cuando el panel guarde un
// cambio, basta con revalidateTag("store-theme").
async function storedTheme(): Promise<StoredTheme | null> {
  "use cache";
  cacheTag("store-theme");
  cacheLife("minutes");
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_SLUG}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const store = (await res.json()) as { theme?: StoredTheme };
    return store.theme && typeof store.theme === "object" ? store.theme : null;
  } catch {
    return null;
  }
}

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
  const stored = await storedTheme();
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
