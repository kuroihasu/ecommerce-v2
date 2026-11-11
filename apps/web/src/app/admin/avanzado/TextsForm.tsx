"use client";

import { useState, useTransition } from "react";
import { saveStore } from "@/lib/admin/actions";
import { defaultTexts, fillText, placeholders, type StoreTexts, type TextData } from "@/themes/texts";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px]";
const MAX = 5;

// Textos de la barra de avisos y de la suscripción. Un campo vacío usa el texto del
// diseño; los comodines ({codigo}, {porcentaje}…) se reemplazan con los datos al día.
export function TextsForm({ initial, active, designs, data }: { initial: StoreTexts; active: string; designs: { id: string; name: string }[]; data: TextData }) {
  const [design, setDesign] = useState(active);
  const d = defaultTexts[design] ?? defaultTexts.atelier;
  const [own, setOwn] = useState(Boolean(initial.announce?.length));
  const [lines, setLines] = useState<string[]>(initial.announce?.length ? initial.announce : d.announce);
  const [title, setTitle] = useState(initial.newsletterTitle ?? "");
  const [thanks, setThanks] = useState(initial.newsletterThanks ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const touch = () => setMsg(null);

  // Sin avisos propios escritos, la tienda vuelve a los del diseño (para quitar la barra
  // está el interruptor de arriba).
  const written = lines.map((l) => l.trim()).filter(Boolean);
  const announce = own && written.length ? written : d.announce;
  const usesCode = (t: string) => t.includes("{codigo}") || t.includes("{porcentaje}");
  const preview = announce.filter((l) => (data.discountCode && data.discountPercent) || !usesCode(l)).map((l) => fillText(l, data));

  const save = () =>
    start(async () => {
      const res = await saveStore({
        settings: { texts: { announce: own ? written : [], newsletterTitle: title.trim(), newsletterThanks: thanks.trim() } },
      });
      setMsg(res.ok ? { ok: true, text: "Guardado. La tienda ya muestra los textos nuevos." } : { ok: false, text: res.error });
    });

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Textos de la tienda</h2>
          <p className="mt-1 text-sm text-zinc-500">Lo que dicen la barra de avisos y la suscripción al correo. Deja un campo vacío para usar el texto del diseño.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Ver ejemplos de
          <select value={design} onChange={(e) => setDesign(e.target.value)} className="h-9 rounded-lg border border-zinc-300 bg-white px-2">
            {designs.map((x) => <option key={x.id} value={x.id}>{x.name}{x.id === active ? " (activo)" : ""}</option>)}
          </select>
        </label>
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">Barra de avisos</h3>
      <div className="mt-2 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="announce-mode" checked={!own} onChange={() => { setOwn(false); touch(); }} className="h-4 w-4 accent-zinc-900" />
          Usar los avisos del diseño
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="announce-mode" checked={own} onChange={() => { if (!own && !initial.announce?.length) setLines(d.announce); setOwn(true); touch(); }} className="h-4 w-4 accent-zinc-900" />
          Escribir mis propios avisos
        </label>
      </div>
      {own ? (
        <div className="mt-3 flex flex-col gap-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input className={input} value={l} maxLength={120} aria-label={`Aviso ${i + 1}`} onChange={(e) => { setLines((cur) => cur.map((x, j) => (j === i ? e.target.value : x))); touch(); }} />
              <button type="button" onClick={() => { setLines((cur) => cur.filter((_, j) => j !== i)); touch(); }} className="h-10 shrink-0 rounded-lg px-3 text-sm text-zinc-600 hover:bg-zinc-100" aria-label={`Quitar aviso ${i + 1}`}>Quitar</button>
            </div>
          ))}
          {lines.length < MAX && (
            <button type="button" onClick={() => { setLines((cur) => [...cur, ""]); touch(); }} className="h-10 self-start rounded-lg border border-dashed border-zinc-300 px-4 text-sm hover:bg-zinc-50">+ Agregar aviso</button>
          )}
          <p className="text-xs text-zinc-500">Hasta {MAX} avisos de 120 caracteres. Van rotando uno a uno (en Vitrina pasan en una sola franja).</p>
        </div>
      ) : null}
      <div className="mt-3 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-white" aria-label="Vista previa de la barra">
        {preview.length ? preview.join("  ·  ") : <span className="text-zinc-400">Sin avisos para mostrar: la barra no aparecerá.</span>}
      </div>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">Suscripción al correo</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Título
          <input className={input} value={title} maxLength={120} placeholder={fillText(d.newsletterTitle, data)} onChange={(e) => { setTitle(e.target.value); touch(); }} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Mensaje después de suscribirse
          <input className={input} value={thanks} maxLength={160} placeholder={fillText(d.newsletterThanks, data)} onChange={(e) => { setThanks(e.target.value); touch(); }} />
        </label>
      </div>

      <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-sm">
        <p className="font-medium">Palabras que se reemplazan solas</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {placeholders.map((p) => (
            <li key={p.key}><code className="rounded bg-white px-1.5 py-0.5 ring-1 ring-zinc-200">{p.key}</code> <span className="text-zinc-600">{p.label}</span> <span className="text-zinc-400">→ {fillText(p.key, data) || "(sin código)"}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-zinc-500">Si no hay un código anunciado, los avisos que lo mencionan se ocultan solos.</p>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar textos"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
