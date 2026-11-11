"use client";

import { clp, downloadCsv } from "@/lib/admin/csv";
import type { AccountingSummary, LedgerEntry, SaleLine } from "@/lib/admin/types";

const TZ = "America/Santiago";
const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const when = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const STATUS: Record<string, string> = { PAID: "Pagado", FULFILLED: "Despachado", DELIVERED: "Entregado" };

// Libro de ventas de la tienda online y descarga del resumen del período.
export function SalesBook({ sales, period, summary: s, entries }: { sales: SaleLine[]; period: { from: string; to: string }; summary: AccountingSummary; entries: LedgerEntry[] }) {
  const suffix = `${period.from}-a-${period.to}`;
  const exportSales = () =>
    downloadCsv(`ventas-online-${suffix}.csv`, [
      ["fecha", "pedido", "cliente", "estado", "unidades", "productos", "envio", "descuento", "neto", "iva", "total"],
      ...sales.map((o) => [day(o.date), o.number, o.email, STATUS[o.status] ?? o.status, o.units, o.products, o.shipping, o.discount, o.total - o.tax, o.tax, o.total]),
    ]);
  const exportSummary = () =>
    downloadCsv(`resumen-${suffix}.csv`, [
      ["concepto", "monto"],
      ["Período", `${period.from} a ${period.to}`],
      ["Ventas tienda online (con IVA)", s.sales.total],
      ["Pedidos pagados", s.sales.count],
      ["Otros ingresos (con IVA)", s.income.total],
      ...s.income.byCategory.map((c) => [`  Ingreso: ${c.category}`, c.total]),
      ["Gastos (con IVA)", s.expense.total],
      ...s.expense.byCategory.map((c) => [`  Gasto: ${c.category}`, c.total]),
      ["Ingresos netos (sin IVA)", s.netIncome],
      ["Gastos netos (sin IVA crédito)", s.netExpenses],
      ["Resultado", s.result],
      ["IVA débito", s.iva.debit],
      ["IVA crédito", s.iva.credit],
      [s.iva.balance >= 0 ? "IVA a pagar (estimado)" : "Remanente de IVA (estimado)", Math.abs(s.iva.balance)],
      ["Movimientos anotados", entries.length],
    ]);

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ventas de la tienda online</h2>
          <p className="text-sm text-zinc-500">Pedidos pagados, despachados o entregados. Se suman solos, no hay que anotarlos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportSummary} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Descargar resumen</button>
          {sales.length > 0 && <button type="button" onClick={exportSales} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Descargar ventas CSV</button>}
        </div>
      </div>
      {sales.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No hay pedidos pagados en este período. Cuando la tienda reciba pagos en línea, aparecerán aquí.</p>
      ) : (
        <div className="mt-4 max-h-[480px] overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Pedido</th>
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 pr-3 text-right font-medium">IVA</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.map((o) => (
                <tr key={o.id}>
                  <td className="py-2.5 pr-3 font-medium">#{o.number}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">{when(o.date)}</td>
                  <td className="py-2.5 pr-3">{o.email}</td>
                  <td className="py-2.5 pr-3">{STATUS[o.status] ?? o.status}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600">{clp(o.tax)}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{clp(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
