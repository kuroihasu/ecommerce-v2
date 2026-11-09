import { adminApi } from "@/lib/admin/api";
import type { AdminStore } from "@/lib/admin/types";
import { fontVariables } from "@/themes/fonts";
import { getThemeDef, themes } from "@/themes/registry";
import { mergeTokens } from "@/themes/tokens";
import { AdminShell } from "../AdminShell";
import { ThemeEditor } from "./ThemeEditor";

export default async function DesignPage() {
  const store = await adminApi<AdminStore>("");
  const def = getThemeDef(store.theme?.template);
  return (
    <AdminShell current="/admin/diseno">
      <h1 className="mb-1 text-2xl font-semibold">Diseño y colores</h1>
      <p className="mb-6 text-zinc-600">Elige uno de los diseños y ajusta colores, tipografías y bordes a tu marca.</p>
      <ThemeEditor
        fontClass={fontVariables}
        initial={{ template: def.id, tokens: mergeTokens(def.defaults, store.theme) }}
        options={themes.map((t) => ({ id: t.id, name: t.name, description: t.description, defaults: t.defaults }))}
      />
    </AdminShell>
  );
}
