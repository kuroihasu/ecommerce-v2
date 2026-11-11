"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveStore } from "@/lib/admin/actions";
import type { SectionDef } from "@/themes/sections";
import { ConfigDialog } from "../ConfigDialog";

type Design = { id: string; name: string; sections: SectionDef[] };

// Ajustes de una sección que se abren en una ventana desde su fila ("Configurar").
export type SectionPanel = { title: string; content: ReactNode };

function Toggle({ s, on, onChange, panel }: { s: SectionDef; on: boolean; onChange: (on: boolean) => void; panel?: SectionPanel }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <label htmlFor={`sec-${s.id}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
        <span className="text-[15px] font-medium">{s.label}</span>
        {s.hint && <span className="text-sm text-zinc-500">{s.hint}</span>}
      </label>
      {panel && <ConfigDialog title={panel.title} label={`Configurar ${s.label}`}>{panel.content}</ConfigDialog>}
      <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer">
        <input id={`sec-${s.id}`} type="checkbox" role="switch" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} aria-label={`Mostrar ${s.label}`} />
        <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

// Mostrar u ocultar partes de la tienda. Se guarda como lista de ids ocultos
// (settings.hiddenSections); lo que no está en la lista se muestra.
export function SectionsForm({
  initialHidden,
  active,
  layout,
  designs,
  panels = {},
}: {
  initialHidden: string[];
  active: string;
  layout: SectionDef[];
  designs: Design[];
  panels?: Record<string, SectionPanel>;
}) {
  const [hidden, setHidden] = useState(() => new Set(initialHidden));
  const [design, setDesign] = useState(active);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const current = designs.find((d) => d.id === design)!;

  const set = (id: string, on: boolean) => {
    setHidden((cur) => {
      const next = new Set(cur);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
    setMsg(null);
  };

  const save = () =>
    start(async () => {
      const res = await saveStore({ settings: { hiddenSections: [...hidden].sort() } });
      setMsg(res.ok ? { ok: true, text: "Guardado. La tienda ya muestra estos cambios." } : { ok: false, text: res.error });
    });

  const shared = (id: string) => designs.filter((d) => d.id !== design && d.sections.some((s) => s.id === id)).map((d) => d.name);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Secciones de la tienda</h2>
      <p className="mt-1 text-sm text-zinc-500">Apaga lo que no quieras mostrar. Nada se borra: si la vuelves a encender, aparece igual que antes. Las que tienen «Configurar» se editan en su propia ventana.</p>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">En todas las páginas</h3>
      <div className="divide-y divide-zinc-100">
        {layout.map((s) => <Toggle key={s.id} s={s} on={!hidden.has(s.id)} onChange={(on) => set(s.id, on)} panel={panels[s.id]} />)}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Portada</h3>
        <label className="flex items-center gap-2 text-sm">
          Diseño
          <select value={design} onChange={(e) => setDesign(e.target.value)} className="h-9 rounded-lg border border-zinc-300 bg-white px-2">
            {designs.map((d) => <option key={d.id} value={d.id}>{d.name}{d.id === active ? " (en uso)" : ""}</option>)}
          </select>
        </label>
      </div>
      {design !== active && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Estás viendo las secciones de {current.name}, que no es el diseño en uso. Los cambios se notan cuando lo elijas en Diseño y colores.</p>}
      <div className="divide-y divide-zinc-100">
        {current.sections.map((s) => {
          const also = shared(s.id);
          const hint = [s.hint, also.length ? `También aplica en ${new Intl.ListFormat("es").format(also)}.` : ""].filter(Boolean).join(" ");
          return <Toggle key={s.id} s={{ ...s, hint }} on={!hidden.has(s.id)} onChange={(on) => set(s.id, on)} panel={panels[s.id]} />;
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
