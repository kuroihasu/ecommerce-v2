"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { deleteEntry, saveEntry } from "@/lib/admin/actions";
import { clp, downloadCsv } from "@/lib/admin/csv";
import type { EntryPayload, LedgerEntry, LedgerKind, TaxDocument } from "@/lib/admin/types";

const TZ = "America/Santiago";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const showDay = (d: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const ivaOf = (total: number) => Math.round((total * 0.19) / 1.19);
const digits = (s: string) => s.replace(/\D/g, "");

export const EXPENSE_CATEGORIES = ["Compra de mercadería", "Arriendo", "Sueldos y honorarios", "Envíos y despacho", "Publicidad", "Comisiones de pago", "Servicios básicos", "Plataformas y software", "Contador", "Impuestos y patentes", "Otros gastos"];
export const INCOME_CATEGORIES = ["Ventas fuera de la web", "Ventas en local", "Ventas en ferias", "Otros ingresos"];
const DOC_LABEL: Record<TaxDocument, string> = { FACTURA: "Factura", BOLETA: "Boleta", NONE: "Sin documento" };
const KIND_LABEL: Record<LedgerKind, string> = { INCOME: "Ingreso", EXPENSE: "Gasto" };

type Draft = { kind: LedgerKind; date: string; category: string; description: string; amount: string; document: TaxDocument; tax: string; taxTouched: boolean; documentNumber: string; counterparty: string; counterpartyRut: string };
const empty = (kind: LedgerKind = "EXPENSE"): Draft => ({ kind, date: today(), category: "", description: "", amount: "", document: kind === "EXPENSE" ? "FACTURA" : "BOLETA", tax: "", taxTouched: false, documentNumber: "", counterparty: "", counterpartyRut: "" });
const toDraft = (e: LedgerEntry): Draft => ({ kind: e.kind, date: e.date, category: e.category, description: e.description, amount: String(e.amount), document: e.document, tax: String(e.taxAmount), taxTouched: true, documentNumber: e.documentNumber ?? "", counterparty: e.counterparty ?? "", counterpartyRut: e.counterpartyRut ?? "" });
// Solo una factura de compra da crédito fiscal; en ingresos, boleta y factura llevan IVA.
const hasTax = (d: Pick<Draft, "kind" | "document">) => d.document === "FACTURA" || (d.kind === "INCOME" && d.document === "BOLETA");

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium ${className}`}>
      {label}
      {children}
    </label>
  );
}
const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal";

// Ingresos y gastos anotados a mano en el período, con su formulario.
export function Ledger({ initial, period }: { initial: LedgerEntry[]; period: { from: string; to: string } }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty());
  const [show, setShow] = useState<"" | LedgerKind>("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const set = (p: Partial<Draft>) =>
    setDraft((d) => {
      const n = { ...d, ...p };
      if (p.kind && p.kind !== d.kind && !d.category) n.document = p.kind === "EXPENSE" ? "FACTURA" : "BOLETA";
      if (!n.taxTouched) n.tax = hasTax(n) ? String(ivaOf(Number(n.amount) || 0)) : "0";
      return n;
    });

  const open = (e: LedgerEntry | null, kind?: LedgerKind) => {
    setError("");
    setEditing(e ? e.id : "new");
    setDraft(e ? toDraft(e) : empty(kind));
  };

  const submit = () =>
    start(async () => {
      setError("");
      const payload: EntryPayload = {
        kind: draft.kind,
        date: draft.date,
        category: draft.category.trim(),
        description: draft.description.trim(),
        amount: Number(draft.amount) || 0,
        taxAmount: hasTax(draft) ? Number(draft.tax) || 0 : 0,
        document: draft.document,
        documentNumber: draft.documentNumber.trim() || null,
        counterparty: draft.counterparty.trim() || null,
        counterpartyRut: draft.counterpartyRut.trim() || null,
      };
      const res = await saveEntry(editing === "new" ? null : editing, payload);
      if (!res.ok) return setError(res.error);
      const inPeriod = res.data.date >= period.from && res.data.date <= period.to;
      setEntries((all) => {
        const rest = all.filter((x) => x.id !== res.data.id);
        return (inPeriod ? [res.data, ...rest] : rest).sort((a, b) => b.date.localeCompare(a.date));
      });
      setEditing(null);
      router.refresh();
    });

  const remove = (e: LedgerEntry) =>
    start(async () => {
      if (!confirm(`¿Borrar «${e.description}» por ${clp(e.amount)}?`)) return;
      const res = await deleteEntry(e.id);
      if (!res.ok) return setError(res.error);
      setEntries((all) => all.filter((x) => x.id !== e.id));
      router.refresh();
    });

  const list = entries.filter((e) => !show || e.kind === show);
  const exportCsv = () =>
    downloadCsv(`ingresos-y-gastos-${period.from}-a-${period.to}.csv`, [
      ["fecha", "tipo", "categoria", "descripcion", "documento", "numero_documento", "proveedor_o_cliente", "rut", "neto", "iva", "total"],
      ...entries.map((e) => [e.date, KIND_LABEL[e.kind], e.category, e.description, DOC_LABEL[e.document], e.documentNumber, e.counterparty, e.counterpartyRut, e.amount - e.taxAmount, e.taxAmount, e.amount]),
    ]);

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ingresos y gastos anotados</h2>
          <p className="text-sm text-zinc-500">Arriendo, mercadería, publicidad, ventas fuera de la web…</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => open(null, "EXPENSE")} className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white">+ Gasto</button>
          <button type="button" onClick={() => open(null, "INCOME")} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50">+ Ingreso</button>
          {entries.length > 0 && <button type="button" onClick={exportCsv} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Descargar CSV</button>}
        </div>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 flex gap-1 rounded-lg bg-zinc-200 p-1 text-sm font-medium sm:w-fit">
            {(["EXPENSE", "INCOME"] as const).map((k) => (
              <button key={k} type="button" onClick={() => set({ kind: k })} className={`h-8 flex-1 rounded-md px-4 ${draft.kind === k ? "bg-white shadow-sm" : "text-zinc-600"}`}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Fecha"><input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} className={input} /></Field>
            <Field label="Categoría">
              <input list={`cats-${draft.kind}`} value={draft.category} onChange={(e) => set({ category: e.target.value })} maxLength={60} placeholder="Elige o escribe" className={input} />
              <datalist id={`cats-${draft.kind}`}>{(draft.kind === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Descripción" className="sm:col-span-2"><input value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={200} placeholder={draft.kind === "EXPENSE" ? "Ej: 40 poleras para la temporada" : "Ej: Ventas feria Bellavista"} className={input} /></Field>
            <Field label="Total (con IVA)"><input inputMode="numeric" value={draft.amount} onChange={(e) => set({ amount: digits(e.target.value) })} placeholder="0" className={input + " tabular-nums"} /></Field>
            <Field label="Documento">
              <select value={draft.document} onChange={(e) => set({ document: e.target.value as TaxDocument, taxTouched: false })} className={input}>
                {(["FACTURA", "BOLETA", "NONE"] as const).map((d) => <option key={d} value={d}>{DOC_LABEL[d]}</option>)}
              </select>
            </Field>
            <Field label={draft.kind === "EXPENSE" ? "IVA crédito" : "IVA débito"}>
              <input inputMode="numeric" value={hasTax(draft) ? draft.tax : "0"} disabled={!hasTax(draft)} onChange={(e) => set({ tax: digits(e.target.value), taxTouched: true })} className={input + " tabular-nums disabled:bg-zinc-100 disabled:text-zinc-400"} />
            </Field>
            <Field label="N° de documento"><input value={draft.documentNumber} onChange={(e) => set({ documentNumber: e.target.value })} maxLength={30} disabled={draft.document === "NONE"} className={input + " disabled:bg-zinc-100"} /></Field>
            <Field label={draft.kind === "EXPENSE" ? "Proveedor" : "Cliente"} className="sm:col-span-2"><input value={draft.counterparty} onChange={(e) => set({ counterparty: e.target.value })} maxLength={120} className={input} /></Field>
            <Field label="RUT"><input value={draft.counterpartyRut} onChange={(e) => set({ counterpartyRut: e.target.value })} maxLength={12} placeholder="76.123.456-7" className={input} /></Field>
          </div>
          {draft.kind === "EXPENSE" && draft.document === "BOLETA" && <p className="mt-2 text-xs text-zinc-500">Una boleta de compra no da crédito de IVA: se cuenta el total como gasto.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={submit} disabled={pending} className="h-10 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
            <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-lg px-4 text-zinc-600 hover:bg-zinc-200">Cancelar</button>
          </div>
        </div>
      )}
      {!editing && error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No hay movimientos anotados en este período.</p>
      ) : (
        <>
          <div className="mt-4 flex gap-1 text-sm">
            {([["", "Todos"], ["EXPENSE", "Gastos"], ["INCOME", "Ingresos"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setShow(k)} className={`h-8 rounded-full px-3 ${show === k ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>{l}</button>
            ))}
          </div>
          <div className="mt-2 max-h-[480px] overflow-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Detalle</th>
                  <th className="py-2 pr-3 font-medium">Documento</th>
                  <th className="py-2 pr-3 text-right font-medium">IVA</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                  <th className="py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">{showDay(e.date)}</td>
                    <td className="py-2.5 pr-3">
                      <span className="block">{e.description}</span>
                      <span className="block text-xs text-zinc-500">{e.category}{e.counterparty && ` · ${e.counterparty}`}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-600">{DOC_LABEL[e.document]}{e.documentNumber && ` ${e.documentNumber}`}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600">{e.taxAmount ? clp(e.taxAmount) : "—"}</td>
                    <td className={`py-2.5 pr-3 text-right font-medium tabular-nums ${e.kind === "INCOME" ? "text-emerald-700" : ""}`}>{e.kind === "INCOME" ? "+" : "−"}{clp(e.amount)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => open(e)} className="h-8 rounded-md px-2 text-zinc-600 hover:bg-zinc-100">Editar</button>
                        <button type="button" onClick={() => remove(e)} className="h-8 rounded-md px-2 text-red-700 hover:bg-red-50">Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
