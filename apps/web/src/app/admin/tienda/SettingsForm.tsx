"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { saveStore } from "@/lib/admin/actions";
import type { AdminStore, StoreSettings } from "@/lib/admin/types";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

// El input datetime-local trabaja sin zona horaria: se muestra y se guarda en hora de Chile.
const toLocal = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const toIso = (local: string) => (local ? `${local}:00-03:00` : "");

export function SettingsForm({ store }: { store: AdminStore }) {
  const [name, setName] = useState(store.name);
  const [s, setS] = useState<StoreSettings>(store.settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<StoreSettings>) => setS((cur) => ({ ...cur, ...patch }));
  const num = (v: string) => Number(v.replace(/\D/g, "") || 0);

  const save = () =>
    start(async () => {
      const res = await saveStore({
        name,
        settings: {
          tagline: s.tagline ?? "",
          email: s.email ?? "",
          shippingRM: s.shippingRM ?? 0,
          shippingRegions: s.shippingRegions ?? 0,
          freeShippingFrom: s.freeShippingFrom ?? 0,
          installments: s.installments || 1,
          nextDrop: s.nextDrop?.name && s.nextDrop.date ? s.nextDrop : null,
        },
      });
      setMsg(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: res.error });
    });

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre de la tienda"><input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <Field label="Frase de la marca"><input className={input} value={s.tagline ?? ""} onChange={(e) => set({ tagline: e.target.value })} maxLength={160} /></Field>
        <Field label="Correo de contacto"><input type="email" className={input} value={s.email ?? ""} onChange={(e) => set({ email: e.target.value })} /></Field>

        <h2 className="mt-2 text-lg font-semibold md:col-span-2">Envíos y pagos</h2>
        <Field label="Envío Región Metropolitana ($)"><input className={input} inputMode="numeric" value={s.shippingRM ?? 0} onChange={(e) => set({ shippingRM: num(e.target.value) })} /></Field>
        <Field label="Envío a regiones ($)"><input className={input} inputMode="numeric" value={s.shippingRegions ?? 0} onChange={(e) => set({ shippingRegions: num(e.target.value) })} /></Field>
        <Field label="Envío gratis desde ($)" hint="0 para no ofrecer envío gratis."><input className={input} inputMode="numeric" value={s.freeShippingFrom ?? 0} onChange={(e) => set({ freeShippingFrom: num(e.target.value) })} /></Field>
        <Field label="Cuotas sin interés"><input className={input} inputMode="numeric" value={s.installments ?? 1} onChange={(e) => set({ installments: num(e.target.value) })} /></Field>
        <p className="text-sm text-zinc-500 md:col-span-2">Los códigos de descuento ahora se manejan en <Link href="/admin/descuentos" className="underline">Descuentos</Link>.</p>

        <h2 className="mt-2 text-lg font-semibold md:col-span-2">Próximo lanzamiento</h2>
        <p className="-mt-2 text-sm text-zinc-500 md:col-span-2">Muestra una cuenta regresiva en la portada del diseño Vitrina. Déjalo vacío para ocultarla.</p>
        <Field label="Nombre"><input className={input} value={s.nextDrop?.name ?? ""} onChange={(e) => set({ nextDrop: { name: e.target.value, date: s.nextDrop?.date ?? "" } })} placeholder="Drop 028 · Verano" /></Field>
        <Field label="Fecha y hora (Chile)"><input type="datetime-local" className={input} value={toLocal(s.nextDrop?.date)} onChange={(e) => set({ nextDrop: { name: s.nextDrop?.name ?? "", date: toIso(e.target.value) } })} /></Field>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
