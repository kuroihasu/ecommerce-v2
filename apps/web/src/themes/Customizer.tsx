"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { fontOptions, type FontKey } from "./fontOptions";
import { colorLabels, readableOn, type ColorKey, type StoredTheme, type ThemeTokens } from "./tokens";

type Option = { id: string; name: string; description: string; defaults: ThemeTokens };
const COOKIE = "theme-preview";

function save(v: StoredTheme | null) {
  document.cookie = v
    ? `${COOKIE}=${encodeURIComponent(JSON.stringify(v))}; path=/; max-age=2592000; samesite=lax`
    : `${COOKIE}=; path=/; max-age=0`;
}

// Personalizador en vivo. Es lo mismo que irá en el panel de administración:
// elegir diseño, colores, tipografías y bordes. Aquí se guarda como vista previa
// (cookie); en el panel se guardará en Store.theme.
export function Customizer({ current, tokens, preview, options }: {
  current: string;
  tokens: ThemeTokens;
  preview: StoredTheme | null;
  options: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(tokens);
  const [shownFor, setShownFor] = useState(current);
  // Al cambiar de diseño, el panel toma los colores del diseño nuevo.
  if (shownFor !== current) {
    setShownFor(current);
    setT(tokens);
  }
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const def = options.find((o) => o.id === current)!;

  const root = () => document.getElementById("theme-root");
  const persist = (next: ThemeTokens) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const colors: StoredTheme["colors"] = {};
      for (const k of Object.keys(next.colors) as ColorKey[]) if (next.colors[k] !== def.defaults.colors[k]) colors[k] = next.colors[k];
      save({ ...preview, template: current, colors, fonts: next.fonts, radius: next.radius });
    }, 250);
  };

  const setColor = (k: ColorKey, v: string) => {
    const next = { ...t, colors: { ...t.colors, [k]: v } };
    setT(next);
    const s = root()?.style;
    if (s) {
      const css = { bg: "--bg", ink: "--ink", surface: "--surface", accent: "--accent", field: "--field", field2: "--field-2" }[k];
      s.setProperty(css, v);
      if (k === "accent") s.setProperty("--accent-ink", readableOn(v));
      if (k === "field") s.setProperty("--field-ink", readableOn(v));
    }
    persist(next);
  };
  const setFont = (k: "display" | "body", v: FontKey) => {
    const next = { ...t, fonts: { ...t.fonts, [k]: v } };
    setT(next);
    root()?.style.setProperty(k === "display" ? "--font-display" : "--font-body", `var(${fontOptions[v].cssVar})`);
    persist(next);
  };
  const setRadius = (v: number) => {
    const next = { ...t, radius: v };
    setT(next);
    root()?.style.setProperty("--radius", `${v}px`);
    persist(next);
  };
  const pick = (id: string) => {
    setPending(id);
    save({ template: id });
    router.refresh();
  };

  const json = JSON.stringify(
    {
      template: current,
      colors: Object.fromEntries(Object.entries(t.colors).filter(([k, v]) => v !== def.defaults.colors[k as ColorKey])),
      fonts: t.fonts,
      radius: t.radius,
    },
    null,
    2,
  );

  // Estilos fijos (no dependen del tema) para que el panel se lea igual en cualquier diseño.
  return (
    <div className="font-[system-ui] text-[#111]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fixed bottom-4 left-4 z-[60] flex h-12 items-center gap-2 rounded-full bg-[#111] px-5 text-base font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.03] active:scale-95"
      >
        {open ? "Cerrar" : "Personalizar"}
      </button>
      {open && (
        <aside
          aria-label="Personalizar diseño"
          className="rise fixed bottom-20 left-4 z-[60] flex max-h-[calc(100vh-7rem)] w-[min(380px,calc(100vw-2rem))] flex-col gap-6 overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
          style={{ animationDuration: "0.25s" }}
        >
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Diseño</h2>
            <div className="flex flex-col gap-2">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pick(o.id)}
                  aria-pressed={o.id === current}
                  className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${o.id === current ? "bg-[#111] text-white" : "bg-[#f2f2f2] hover:bg-[#e6e6e6]"}`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-md">
                    {[o.defaults.colors.bg, o.defaults.colors.accent, o.defaults.colors.field].map((c, k) => (
                      <span key={k} className="h-8 w-4" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">{o.name}{pending === o.id && o.id !== current ? " · cargando…" : ""}</span>
                    <span className={`text-sm ${o.id === current ? "text-white/75" : "text-black/60"}`}>{o.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Colores</h2>
            {(Object.keys(colorLabels) as ColorKey[]).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                <span>{colorLabels[k]}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-black/60">{t.colors[k]}</span>
                  <input type="color" value={t.colors[k]} onChange={(e) => setColor(k, e.target.value)} className="h-9 w-12 cursor-pointer rounded-md bg-transparent" />
                </span>
              </label>
            ))}
            <p className="text-xs text-black/60">El texto sobre botones y bloques se ajusta solo a blanco o negro para que siempre se lea.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Tipografía</h2>
            {(["display", "body"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-sm">
                {k === "display" ? "Títulos" : "Texto"}
                <select value={t.fonts[k]} onChange={(e) => setFont(k, e.target.value as FontKey)} className="h-10 rounded-lg bg-[#f2f2f2] px-2">
                  {Object.entries(fontOptions).map(([v, o]) => <option key={v} value={v}>{o.label}</option>)}
                </select>
              </label>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Bordes</h2>
            <label className="flex items-center gap-3 text-sm">
              <input type="range" min={0} max={32} value={t.radius} onChange={(e) => setRadius(Number(e.target.value))} className="flex-1" />
              <span className="w-12 text-right">{t.radius}px</span>
            </label>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  save(null);
                  router.refresh();
                  setT(def.defaults);
                }}
                className="h-10 flex-1 rounded-lg bg-[#f2f2f2] text-sm font-medium hover:bg-[#e6e6e6]"
              >
                Restablecer
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(json);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="h-10 flex-1 rounded-lg bg-[#111] text-sm font-medium text-white"
              >
                {copied ? "Copiado" : "Copiar configuración"}
              </button>
            </div>
            <p className="text-xs text-black/60">Esta es la configuración que el panel guardará en la tienda (Store.theme).</p>
          </section>
        </aside>
      )}
    </div>
  );
}
