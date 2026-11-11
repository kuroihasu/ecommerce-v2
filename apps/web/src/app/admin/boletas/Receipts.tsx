"use client";

import { useState, useTransition } from "react";
import { issueReceipt } from "@/lib/admin/actions";
import { clp, downloadCsv } from "@/lib/admin/csv";
import type { Receipt, ReceiptList } from "@/lib/admin/types";

const TZ = "America/Santiago";
const when = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const receiptName = (type: number) => (type === 41 ? "Boleta exenta" : "Boleta");

function Status({ r }: { r: Receipt }) {
  if (r.status === "ISSUED") return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">{r.test ? "Emitida (prueba)" : "Emitida"}</span>;
  if (r.status === "ISSUING") return <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900">Emitiéndose</span>;
  return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-900">Con error</span>;
}

// Boletas emitidas (o con error, para reintentar) y pedidos pagados que aún no tienen.
export function Receipts({ initial }: { initial: ReceiptList }) {
  const [list, setList] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const issue = (orderId: string, number: number) =>
    start(async () => {
      setBusy(orderId);
      setMsg(null);
      const r = await issueReceipt(orderId);
      setBusy(null);
      if (!r.ok) return setMsg(`Pedido #${number}: ${r.error}`);
      const row = { ...r.data, order: list.receipts.find((x) => x.orderId === orderId)?.order ?? { number, email: list.missing.find((m) => m.id === orderId)?.email ?? "", name: null } };
      setList((l) => ({ receipts: [row, ...l.receipts.filter((x) => x.id !== row.id)], missing: l.missing.filter((m) => m.id !== orderId) }));
      if (r.data.status === "FAILED") setMsg(`Pedido #${number}: ${r.data.error}`);
    });

  const exportCsv = () =>
    downloadCsv("boletas.csv", [
      ["fecha", "tipo", "folio", "pedido", "rut receptor", "neto", "iva", "exento", "total", "estado", "prueba"],
      ...list.receipts.map((r) => [r.issueDate ?? "", r.type, r.folio ?? "", r.order?.number ?? "", r.receiverRut, r.netAmount, r.taxAmount, r.exemptAmount, r.total, r.status, r.test ? "sí" : "no"]),
    ]);

  return (
    <>
      {list.missing.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-lg font-semibold">Pedidos pagados sin boleta</h2>
          <p className="text-sm text-zinc-600">Por ejemplo, los pagados antes de activar las boletas. Los pagados en modo de prueba no llevan boleta real.</p>
          <ul className="mt-3 divide-y divide-amber-100">
            {list.missing.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-16 font-semibold">#{o.number}</span>
                <span className="min-w-0 flex-1 truncate">{o.email}</span>
                <span className="text-zinc-500">{when(o.createdAt)}</span>
                <span className="w-24 text-right tabular-nums">{clp(o.total)}</span>
                {o.testPayment ? (
                  <span className="w-32 text-right text-xs text-zinc-500">Pago de prueba</span>
                ) : (
                  <button disabled={busy !== null} onClick={() => issue(o.id, o.number)} className="h-9 w-32 rounded-lg border border-zinc-300 bg-white px-3 font-medium hover:bg-zinc-50 disabled:opacity-60">
                    {busy === o.id ? "Emitiendo…" : "Emitir boleta"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Boletas</h2>
          {list.receipts.length > 0 && <button type="button" onClick={exportCsv} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Descargar CSV</button>}
        </div>
        {msg && <p role="status" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</p>}
        {list.receipts.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Todavía no hay boletas. Aparecerán aquí apenas se pague un pedido con las boletas activadas.</p>
        ) : (
          <div className="mt-4 max-h-[560px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Documento</th>
                  <th className="py-2 pr-3 font-medium">Pedido</th>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Receptor</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 font-medium"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.receipts.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2.5 pr-3 font-medium">{receiptName(r.type)}{r.folio ? ` N° ${r.folio}` : ""}</td>
                    <td className="py-2.5 pr-3">{r.order ? `#${r.order.number}` : "—"}</td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">{when(r.createdAt)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.receiverRut === "66666666-6" ? "Consumidor final" : r.receiverRut}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{clp(r.total)}</td>
                    <td className="py-2.5 pr-3">
                      <Status r={r} />
                      {r.status === "FAILED" && r.error && <p className="mt-1 max-w-xs text-xs text-red-800">{r.error}</p>}
                    </td>
                    <td className="py-2.5 text-right">
                      {r.status === "ISSUED" ? (
                        <a href={`/admin/boletas/${r.id}/pdf`} target="_blank" rel="noopener" className="underline">PDF</a>
                      ) : r.orderId ? (
                        <button disabled={busy !== null} onClick={() => issue(r.orderId!, r.order?.number ?? 0)} className="h-8 rounded-lg border border-zinc-300 px-3 hover:bg-zinc-50 disabled:opacity-60">
                          {busy === r.orderId ? "Emitiendo…" : "Reintentar"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
