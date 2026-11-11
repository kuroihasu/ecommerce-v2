"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveStore } from "@/lib/admin/actions";
import { fontOptions, type FontKey } from "@/themes/fontOptions";
import { colorLabels, readableOn, type ColorKey, type ThemeTokens } from "@/themes/tokens";

type Option = { id: string; name: string; description: string; defaults: ThemeTokens };
const colorKeys = Object.keys(colorLabels) as ColorKey[];

export function ThemeEditor({ initial, options, fontClass }: { initial: { template: string; tokens: ThemeTokens }; options: Option[]; fontClass: string }) {
  const [template, setTemplate] = useState(initial.template);
  const [t, setT] = useState(initial.tokens);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const def = options.find((o) => o.id === template)!;

  // Al cambiar de diseño se parte de sus colores y tipografías, que fueron pensados juntos.
  const choose = (id: string) => {
    setTemplate(id);
    setT(options.find((o) => o.id === id)!.defaults);
    setMsg(null);
  };

  const save = () =>
    start(async () => {
      // Solo se guarda lo que difiere del diseño, así si el diseño mejora sus valores la tienda los hereda.
      const colors = Object.fromEntries(colorKeys.filter((k) => t.colors[k] !== def.defaults.colors[k]).map((k) => [k, t.colors[k]]));
      const fonts = Object.fromEntries((["display", "body"] as const).filter((k) => t.fonts[k] !== def.defaults.fonts[k]).map((k) => [k, t.fonts[k]]));
      const res = await saveStore({
        theme: { template, colors, fonts, ...(t.radius !== def.defaults.radius ? { radius: t.radius } : {}) },
      });
      setMsg(res.ok ? { ok: true, text: "Guardado. La tienda ya muestra este diseño." } : { ok: false, text: res.error });
    });

  const accentInk = readableOn(t.colors.accent);
  const fieldInk = readableOn(t.colors.field);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              aria-pressed={template === o.id}
              className={`flex flex-col gap-3 rounded-xl border-2 bg-white p-4 text-left transition-colors ${template === o.id ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400"}`}
            >
              <span className="flex gap-1">
                {(["bg", "ink", "accent", "field"] as const).map((k) => (
                  <span key={k} className="size-6 rounded-full border border-black/10" style={{ background: o.defaults.colors[k] }} />
                ))}
              </span>
              <span className="font-semibold">{o.name}</span>
              <span className="text-sm text-zinc-600">{o.description}</span>
            </button>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Colores</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {colorKeys.map((k) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <input type="color" value={t.colors[k]} onChange={(e) => setT({ ...t, colors: { ...t.colors, [k]: e.target.value } })} className="h-10 w-12 shrink-0 rounded border border-zinc-300" />
                <span className="flex-1">{colorLabels[k]}</span>
                <code className="text-xs text-zinc-500">{t.colors[k]}</code>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Tipografías y bordes</h2>
          {(["display", "body"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1.5 text-sm font-medium">
              {k === "display" ? "Títulos" : "Textos"}
              <select value={t.fonts[k]} onChange={(e) => setT({ ...t, fonts: { ...t.fonts, [k]: e.target.value as FontKey } })} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal">
                {Object.entries(fontOptions).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
              </select>
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Redondeo de bordes: {t.radius}px
            <input type="range" min={0} max={40} value={t.radius} onChange={(e) => setT({ ...t, radius: Number(e.target.value) })} />
          </label>
          <button type="button" onClick={() => setT(def.defaults)} className="justify-self-start text-sm text-zinc-600 underline">Volver a los valores del diseño</button>
        </section>
      </div>

      {/* Muestra en vivo con los colores elegidos */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className={`${fontClass} overflow-hidden rounded-xl border border-zinc-200`} style={{ background: t.colors.bg, color: t.colors.ink }}>
          <div className="p-5">
            <p className="text-3xl leading-tight" style={{ fontFamily: `var(${fontOptions[t.fonts.display].cssVar})` }}>Nueva colección</p>
            <p className="mt-2 text-sm opacity-80" style={{ fontFamily: `var(${fontOptions[t.fonts.body].cssVar})` }}>Así se ven los textos de la tienda con estos colores.</p>
            <div className="mt-4 flex gap-2">
              <span className="px-4 py-2 text-sm font-medium" style={{ background: t.colors.accent, color: accentInk, borderRadius: t.radius }}>Agregar al carrito</span>
              <span className="px-4 py-2 text-sm" style={{ background: t.colors.surface, borderRadius: t.radius }}>Filtro</span>
            </div>
          </div>
          <div className="p-5" style={{ background: t.colors.field, color: fieldInk }}>
            <p className="font-semibold">Bloque de color</p>
            <p className="text-sm opacity-80">Banners y secciones destacadas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={pending} className="h-11 flex-1 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar diseño"}
          </button>
          <Link href="/" target="_blank" className="grid h-11 place-items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm">Ver tienda ↗</Link>
        </div>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </aside>
    </div>
  );
}
