"use client";

import { useState } from "react";
import type { MonthRow } from "@/lib/admin/types";
import { clp } from "@/lib/admin/csv";

// Colores de serie validados (azul = ingresos, naranja = gastos).
const INCOME = "#2a78d6";
const EXPENSE = "#eb6834";
const short = (m: string) => new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`)).replace(".", "");
const long = (m: string) => new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
const compact = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M` : n >= 1000 ? `$${Math.round(n / 1000)} mil` : clp(n));

// Ingresos (ventas online + otros) contra gastos de los últimos 12 meses, con IVA.
export function MonthlyChart({ rows }: { rows: MonthRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = rows.map((r) => ({ ...r, in: r.sales + r.income }));
  const max = Math.max(1, ...data.map((r) => Math.max(r.in, r.expenses)));
  const empty = data.every((r) => r.in === 0 && r.expenses === 0);
  const H = 160;
  const h = hover === null ? null : data[hover];

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Últimos 12 meses</h2>
        <div className="flex gap-4 text-sm text-zinc-600">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: INCOME }} />Ingresos</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: EXPENSE }} />Gastos</span>
        </div>
      </div>
      {empty ? (
        <p className="mt-4 text-sm text-zinc-500">Cuando tengas ventas o anotes movimientos, aquí verás cómo te va mes a mes.</p>
      ) : (
        <div className="relative mt-4">
          <div className="grid grid-cols-12 items-end gap-1 border-b border-zinc-200" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {data.map((r, i) => (
              <button
                key={r.month}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${long(r.month)}: ingresos ${clp(r.in)}, gastos ${clp(r.expenses)}`}
                className={`flex h-full items-end justify-center gap-[2px] rounded-t-md ${hover === i ? "bg-zinc-100" : ""}`}
              >
                <span className="w-[38%] max-w-4 rounded-t" style={{ height: `${(r.in / max) * (H - 8)}px`, background: INCOME }} />
                <span className="w-[38%] max-w-4 rounded-t" style={{ height: `${(r.expenses / max) * (H - 8)}px`, background: EXPENSE }} />
              </button>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-12 gap-1 text-center text-xs text-zinc-500">
            {data.map((r) => <span key={r.month}>{short(r.month)}</span>)}
          </div>
          {h && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 w-52 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg"
              style={{ left: `clamp(0px, calc(${((hover! + 0.5) / 12) * 100}% - 104px), calc(100% - 208px))` }}
            >
              <p className="mb-1 font-medium first-letter:uppercase">{long(h.month)}</p>
              <p className="flex justify-between"><span className="text-zinc-500">Ventas online</span><span className="tabular-nums">{clp(h.sales)}</span></p>
              <p className="flex justify-between"><span className="text-zinc-500">Otros ingresos</span><span className="tabular-nums">{clp(h.income)}</span></p>
              <p className="flex justify-between"><span className="text-zinc-500">Gastos</span><span className="tabular-nums">{clp(h.expenses)}</span></p>
              <p className="mt-1 flex justify-between border-t border-zinc-100 pt-1 font-medium"><span>Diferencia</span><span className="tabular-nums">{clp(h.in - h.expenses)}</span></p>
            </div>
          )}
          <p className="mt-2 text-xs text-zinc-500">Máximo del gráfico: {compact(max)}. Montos con IVA.</p>
        </div>
      )}
    </section>
  );
}
