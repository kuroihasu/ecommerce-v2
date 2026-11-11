"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveStore } from "@/lib/admin/actions";
import type { AdminDiscount, WheelConfig, WheelPrizeConfig } from "@/lib/admin/types";
import { targetRotation, WheelDisc, type Slice } from "@/designs/WheelDisc";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal";
const MAX = 8;

function usable(c: AdminDiscount | undefined) {
  if (!c) return false;
  if (!c.active) return false;
  if (c.expiresAt && new Date(c.expiresAt) <= new Date()) return false;
  return c.maxUses === null || c.usedCount < c.maxUses;
}

export function WheelForm({ initial, codes, palette }: { initial: WheelConfig; codes: AdminDiscount[]; palette: Slice[] }) {
  const [w, setW] = useState<WheelConfig>(initial);
  const [rotation, setRotation] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const byCode = new Map(codes.map((c) => [c.code, c]));

  const set = (patch: Partial<WheelConfig>) => {
    setW((cur) => ({ ...cur, ...patch }));
    setMsg(null);
  };
  const setPrize = (i: number, patch: Partial<WheelPrizeConfig>) => set({ prizes: w.prizes.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  // Un premio cuyo código no sirve hoy no sale en el sorteo, igual que en el servidor.
  const effective = w.prizes.map((p) => (p.code && !usable(byCode.get(p.code)) ? 0 : p.weight));
  const total = effective.reduce((a, b) => a + b, 0);
  const pct = (i: number) => (total ? Math.round((effective[i] / total) * 100) : 0);

  const pickCode = (i: number, code: string) => {
    const p = w.prizes[i];
    const prev = byCode.get(p.code);
    const next = byCode.get(code);
    // Si el texto era el automático del código anterior, se actualiza solo.
    const auto = !p.label || (prev && p.label === `${prev.percent}% OFF`) || (!p.code && p.label === "Sigue participando");
    setPrize(i, { code, ...(auto ? { label: next ? `${next.percent}% OFF` : "Sigue participando" } : {}) });
  };

  const test = () => {
    if (!total) return;
    let r = Math.random() * total;
    let i = 0;
    while (r >= effective[i]) r -= effective[i++];
    setRotation((cur) => targetRotation(cur, i, w.prizes.length));
  };

  const save = () =>
    start(async () => {
      const prizes = w.prizes.map((p) => ({ ...p, label: p.label.trim() }));
      if (prizes.some((p) => !p.label)) return setMsg({ ok: false, text: "Cada premio necesita un texto." });
      if (w.enabled && !total) return setMsg({ ok: false, text: "Ningún premio puede salir: revisa las probabilidades o activa los códigos." });
      const res = await saveStore({ settings: { wheel: { ...w, title: w.title.trim(), subtitle: w.subtitle.trim(), prizes } } });
      setMsg(res.ok ? { ok: true, text: w.enabled ? "Guardado. La ruleta ya aparece en la tienda." : "Guardado. La ruleta está apagada." } : { ok: false, text: res.error });
    });

  const liveCodes = codes.filter(usable);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Mostrar la ruleta en la tienda</span>
          <span className="text-sm text-zinc-500">Aparece una sola vez por visitante. Si la cierra, queda un botón «Gira y gana» en la esquina.</span>
        </span>
        <span className="relative mt-1 inline-flex shrink-0">
          <input type="checkbox" role="switch" className="peer sr-only" checked={w.enabled} onChange={(e) => set({ enabled: e.target.checked })} aria-label="Mostrar la ruleta en la tienda" />
          <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2" />
          <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Título
              <input className={input} value={w.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="Gira y gana" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Aparece después de
              <span className="flex items-center gap-2">
                <input className={`${input} w-24`} inputMode="numeric" value={w.delaySeconds} onChange={(e) => set({ delaySeconds: Math.min(120, Number(e.target.value.replace(/\D/g, "") || 0)) })} aria-label="Segundos antes de aparecer" />
                <span className="font-normal text-zinc-600">segundos en la tienda</span>
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              Texto de invitación
              <input className={input} value={w.subtitle} maxLength={140} onChange={(e) => set({ subtitle: e.target.value })} />
            </label>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Premios</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Cada premio entrega uno de tus <Link href="/admin/descuentos" className="underline">códigos de descuento</Link>. Sube el peso de un premio para que salga más seguido; al lado ves su probabilidad real.
            </p>
            {liveCodes.length === 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No tienes códigos activos. Crea uno en Descuentos para que la ruleta pueda regalarlo.</p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              <div className="hidden grid-cols-[1fr_1fr_120px_64px] gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:grid">
                <span>Texto en la ruleta</span><span>Premio</span><span>Peso y probabilidad</span><span />
              </div>
              {w.prizes.map((p, i) => {
                const c = byCode.get(p.code);
                const broken = p.code && !usable(c);
                return (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-2 sm:grid-cols-[1fr_1fr_120px_64px] sm:bg-transparent sm:p-0">
                    <input className={`${input} col-span-2 sm:col-span-1`} value={p.label} maxLength={24} onChange={(e) => setPrize(i, { label: e.target.value })} aria-label={`Texto del premio ${i + 1}`} />
                    <select className={`${input} col-span-2 sm:col-span-1`} value={p.code} onChange={(e) => pickCode(i, e.target.value)} aria-label={`Código del premio ${i + 1}`}>
                      <option value="">Sin premio (solo suscribirse)</option>
                      {codes.map((d) => (
                        <option key={d.id} value={d.code}>{d.code} · {d.percent}%{usable(d) ? "" : " (no disponible)"}</option>
                      ))}
                      {p.code && !c && <option value={p.code}>{p.code} (borrado)</option>}
                    </select>
                    <span className="flex items-center gap-1.5">
                      <input className={`${input} w-16`} inputMode="numeric" value={p.weight} onChange={(e) => setPrize(i, { weight: Math.min(100, Number(e.target.value.replace(/\D/g, "") || 0)) })} aria-label={`Peso del premio ${i + 1}`} />
                      <span className="w-10 text-sm tabular-nums text-zinc-600" title="Probabilidad real">{pct(i)}%</span>
                    </span>
                    <button type="button" disabled={w.prizes.length <= 2} onClick={() => set({ prizes: w.prizes.filter((_, j) => j !== i) })} className="h-10 rounded-lg px-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40" aria-label={`Quitar premio ${i + 1}`}>
                      Quitar
                    </button>
                    {broken && <p className="col-span-full -mt-1 text-xs text-amber-800">Este código está pausado, vencido, agotado o borrado: no saldrá hasta que vuelva a estar activo.</p>}
                  </div>
                );
              })}
            </div>
            {w.prizes.length < MAX && (
              <button type="button" onClick={() => set({ prizes: [...w.prizes, { label: "", code: "", weight: 10 }] })} className="mt-3 h-10 rounded-lg border border-dashed border-zinc-300 px-4 text-sm hover:bg-zinc-50">
                + Agregar premio
              </button>
            )}
            <p className="mt-2 text-xs text-zinc-500">Entre 2 y {MAX} premios. Un correo participa una sola vez: si vuelve a girar, recibe el mismo premio.</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <WheelDisc labels={w.prizes.map((p) => p.label || "…")} palette={palette} rotation={rotation} duration={rotation ? 4000 : 0} className="w-64 text-zinc-900" />
          <button type="button" onClick={test} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Probar un giro</button>
          <p className="text-center text-xs text-zinc-500">Vista previa con los colores de tu diseño. Probar no guarda nada ni entrega códigos.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
