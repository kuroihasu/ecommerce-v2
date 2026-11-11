"use client";

import { useState, useTransition, type ReactNode } from "react";
import { deleteDiscount, featureDiscount, saveDiscount, setDiscountActive } from "@/lib/admin/actions";
import type { AdminDiscount, DiscountPayload } from "@/lib/admin/types";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal";
const TZ = "America/Santiago";

// Las fechas se eligen por día y el código vale hasta el final de ese día, hora de Chile.
const toDay = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)) : "");
const fromDay = (day: string) => (day ? `${day}T23:59:59-03:00` : null);
const showDay = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

type Status = { label: string; tone: string; live: boolean };
function status(d: AdminDiscount): Status {
  if (!d.active) return { label: "Pausado", tone: "bg-zinc-100 text-zinc-600", live: false };
  if (d.expiresAt && new Date(d.expiresAt) <= new Date()) return { label: "Vencido", tone: "bg-amber-50 text-amber-800", live: false };
  if (d.maxUses !== null && d.usedCount >= d.maxUses) return { label: "Agotado", tone: "bg-amber-50 text-amber-800", live: false };
  return { label: "Activo", tone: "bg-emerald-50 text-emerald-800", live: true };
}

type Draft = { code: string; percent: string; limited: boolean; maxUses: string; expires: boolean; day: string; active: boolean };
const empty: Draft = { code: "", percent: "10", limited: false, maxUses: "100", expires: false, day: "", active: true };
const toDraft = (d: AdminDiscount): Draft => ({
  code: d.code,
  percent: String(d.percent),
  limited: d.maxUses !== null,
  maxUses: String(d.maxUses ?? 100),
  expires: d.expiresAt !== null,
  day: toDay(d.expiresAt),
  active: d.active,
});

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

function Choice({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-zinc-900" />
      {children}
    </label>
  );
}

function Editor({ editing, onDone, onCancel }: { editing: AdminDiscount | null; onDone: (d: AdminDiscount) => void; onCancel: () => void }) {
  const [f, setF] = useState<Draft>(editing ? toDraft(editing) : empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => {
    setF((cur) => ({ ...cur, ...patch }));
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const percent = Number(f.percent);
    const maxUses = Number(f.maxUses);
    if (!/^[A-Z0-9_-]{3,30}$/.test(f.code)) return setError("El código debe tener entre 3 y 30 letras sin tilde, números o guiones, sin espacios.");
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) return setError("El porcentaje va de 1% a 90%.");
    if (f.limited && (!Number.isInteger(maxUses) || maxUses < 1)) return setError("Indica cuántas veces se puede usar el código (1 o más).");
    if (f.expires && !f.day) return setError("Elige hasta qué día vale el código.");
    const payload: DiscountPayload = {
      code: f.code,
      percent,
      maxUses: f.limited ? maxUses : null,
      expiresAt: f.expires ? fromDay(f.day) : null,
      active: f.active,
    };
    start(async () => {
      const res = await saveDiscount(editing?.id ?? null, payload);
      if (res.ok) onDone({ ...res.data, featured: res.data.featured ?? false });
      else setError(res.error);
    });
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{editing ? `Editar ${editing.code}` : "Nuevo código"}</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <Field label="Código" hint="Lo que el cliente escribe en el carrito. Ej: VERANO15">
          <input className={`${input} uppercase`} value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} maxLength={30} required />
        </Field>
        <Field label="Descuento">
          <span className="relative">
            <input className={`${input} pr-8`} inputMode="numeric" value={f.percent} onChange={(e) => set({ percent: e.target.value.replace(/\D/g, "").slice(0, 2) })} aria-label="Porcentaje de descuento" required />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500">%</span>
          </span>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">¿Cuántas veces se puede usar?</legend>
          <Choice name="uses" checked={!f.limited} onChange={() => set({ limited: false })}>Ilimitado</Choice>
          <Choice name="uses" checked={f.limited} onChange={() => set({ limited: true })}>Una cantidad fija</Choice>
          {f.limited && (
            <span className="ml-6 flex items-center gap-2 text-sm">
              <input className={`${input} w-28`} inputMode="numeric" value={f.maxUses} onChange={(e) => set({ maxUses: e.target.value.replace(/\D/g, "").slice(0, 7) })} aria-label="Cantidad de usos" />
              usos en total
            </span>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">¿Hasta cuándo vale?</legend>
          <Choice name="expiry" checked={!f.expires} onChange={() => set({ expires: false })}>Sin fecha de término</Choice>
          <Choice name="expiry" checked={f.expires} onChange={() => set({ expires: true })}>Hasta una fecha</Choice>
          {f.expires && (
            <span className="ml-6 flex flex-col gap-1">
              <input type="date" className={`${input} w-48`} value={f.day} min={editing ? undefined : today()} onChange={(e) => set({ day: e.target.value })} aria-label="Último día válido" />
              <span className="text-xs text-zinc-500">Vale hasta las 23:59 de ese día.</span>
            </span>
          )}
        </fieldset>
      </div>
      <label className="mt-5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-zinc-900" />
        Activo (los clientes ya pueden usarlo)
      </label>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear código"}</button>
        {editing && <button type="button" onClick={onCancel} className="h-11 rounded-lg px-4 text-zinc-700 hover:bg-zinc-100">Cancelar</button>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </form>
  );
}

type Filter = "todos" | "activos" | "inactivos";

export function DiscountManager({ initial }: { initial: AdminDiscount[] }) {
  const [codes, setCodes] = useState(initial);
  const [editing, setEditing] = useState<AdminDiscount | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [filter, setFilter] = useState<Filter>("todos");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const live = codes.filter((d) => status(d).live).length;
  const shown = codes.filter((d) => filter === "todos" || (filter === "activos") === status(d).live);

  const run = <T,>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, apply: (data: T) => void, text: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) apply(res.data);
      setMsg(res.ok ? { ok: true, text } : { ok: false, text: res.error });
    });

  const done = (d: AdminDiscount) => {
    setCodes((cur) => (cur.some((c) => c.id === d.id) ? cur.map((c) => (c.id === d.id ? d : c)) : [d, ...cur]));
    setMsg({ ok: true, text: editing ? `Guardamos ${d.code}.` : `Creamos ${d.code}. Ya se puede usar en el carrito.` });
    setEditing(null);
    setFormKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <Editor key={editing?.id ?? `new-${formKey}`} editing={editing} onDone={done} onCancel={() => setEditing(null)} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Tus códigos</h2>
            <p className="text-sm text-zinc-500">{live === 1 ? "1 código activo" : `${live} códigos activos`} de {codes.length}.</p>
          </div>
          <div role="group" aria-label="Filtrar códigos" className="flex rounded-lg bg-zinc-100 p-1 text-sm">
            {(["todos", "activos", "inactivos"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 capitalize ${filter === k ? "bg-white shadow-sm" : "text-zinc-600"}`}>
                {k}
              </button>
            ))}
          </div>
        </div>
        {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}

        {shown.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">{codes.length === 0 ? "Todavía no tienes códigos. Crea el primero arriba." : "No hay códigos en este filtro."}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Código</th>
                  <th className="py-2 pr-3 font-medium">Descuento</th>
                  <th className="py-2 pr-3 font-medium">Usos</th>
                  <th className="py-2 pr-3 font-medium">Vence</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shown.map((d) => {
                  const st = status(d);
                  return (
                    <tr key={d.id} className={editing?.id === d.id ? "bg-zinc-50" : ""}>
                      <td className="py-3 pr-3">
                        <span className="font-mono font-medium">{d.code}</span>
                        {d.featured && <span className="ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-medium text-white">En la tienda</span>}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{d.percent}%</td>
                      <td className="py-3 pr-3 tabular-nums">{d.maxUses === null ? `${d.usedCount} · ilimitado` : `${d.usedCount} de ${d.maxUses}`}</td>
                      <td className="py-3 pr-3">{d.expiresAt ? showDay(d.expiresAt) : <span className="text-zinc-500">Sin fecha</span>}</td>
                      <td className="py-3 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.tone}`}>{st.label}</span></td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" disabled={pending} onClick={() => run(() => setDiscountActive(d.id, !d.active), (u) => setCodes((cur) => cur.map((c) => (c.id === d.id ? { ...c, active: u.active, featured: u.featured } : c))), d.active ? `${d.code} quedó pausado.` : `${d.code} quedó activo.`)} className="rounded-md px-2 py-1.5 hover:bg-zinc-100">
                            {d.active ? "Pausar" : "Activar"}
                          </button>
                          {!d.featured && d.active && (
                            <button type="button" disabled={pending} onClick={() => run(() => featureDiscount(d.id), () => setCodes((cur) => cur.map((c) => ({ ...c, featured: c.id === d.id }))), `La tienda ahora anuncia ${d.code}.`)} className="rounded-md px-2 py-1.5 hover:bg-zinc-100" title="Mostrarlo en la barra de avisos y en la suscripción">
                              Anunciar
                            </button>
                          )}
                          <button type="button" onClick={() => { setEditing(d); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-md px-2 py-1.5 hover:bg-zinc-100">Editar</button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              if (!confirm(`¿Borrar el código ${d.code}? Los clientes ya no podrán usarlo.`)) return;
                              run(() => deleteDiscount(d.id), () => { setCodes((cur) => cur.filter((c) => c.id !== d.id)); if (editing?.id === d.id) setEditing(null); }, `Borramos ${d.code}.`);
                            }}
                            className="rounded-md px-2 py-1.5 text-red-700 hover:bg-red-50"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-zinc-500">
          El código marcado «En la tienda» es el que anuncian la barra de avisos y la suscripción. Los usos se cuentan cuando se confirma un pedido.
        </p>
      </section>
    </div>
  );
}
