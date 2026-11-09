import type { ReactNode } from "react";
import { fontVariables } from "./fonts";
import { themes } from "./registry";
import { getActiveTheme } from "./resolve";
import { tokensToCss } from "./tokens";
import { Customizer } from "./Customizer";
import { CatalogProvider } from "@/designs/CatalogProvider";
import { getCatalog } from "@/lib/catalog";

// Envoltorio de la tienda: aplica los tokens del tema activo como variables CSS
// y monta el menú/pie del diseño elegido.
export async function ThemeRoot({ children }: { children: ReactNode }) {
  const [{ def, tokens, preview }, catalog] = await Promise.all([getActiveTheme(), getCatalog()]);
  const showCustomizer = process.env.NEXT_PUBLIC_HIDE_CUSTOMIZER !== "1";
  return (
    <div id="theme-root" data-theme={def.id} style={tokensToCss(tokens)} className={`${fontVariables} flex min-h-screen flex-col`}>
      <CatalogProvider catalog={catalog}>
        <def.Layout>{children}</def.Layout>
      </CatalogProvider>
      {showCustomizer && (
        <Customizer
          current={def.id}
          tokens={tokens}
          preview={preview}
          options={themes.map((t) => ({ id: t.id, name: t.name, description: t.description, defaults: t.defaults }))}
        />
      )}
    </div>
  );
}
