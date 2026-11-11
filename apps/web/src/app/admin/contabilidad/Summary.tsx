import type { AccountingSummary } from "@/lib/admin/types";
import { clp } from "@/lib/admin/csv";

function Card({ label, value, children, tone }: { label: string; value: string; children?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : ""}`}>{value}</p>
      {children && <div className="mt-1 text-xs text-zinc-500">{children}</div>}
    </div>
  );
}

// Tarjetas del período: ventas, ingresos, gastos, resultado e IVA estimado.
export function Summary({ s }: { s: AccountingSummary }) {
  const ivaDue = s.iva.balance >= 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Ventas tienda online" value={clp(s.sales.total)}>
          {s.sales.count === 1 ? "1 pedido pagado" : `${s.sales.count} pedidos pagados`}
          {s.sales.discounts > 0 && ` · ${clp(s.sales.discounts)} en descuentos`}
        </Card>
        <Card label="Otros ingresos" value={clp(s.income.total)}>
          {s.income.byCategory.length ? s.income.byCategory.slice(0, 2).map((c) => `${c.category} ${clp(c.total)}`).join(" · ") : "Ventas fuera de la web y otros"}
        </Card>
        <Card label="Gastos" value={clp(s.expense.total)}>
          {s.expense.byCategory.length ? s.expense.byCategory.slice(0, 2).map((c) => `${c.category} ${clp(c.total)}`).join(" · ") : "Aún no anotas gastos"}
        </Card>
        <Card label="Resultado (sin IVA)" value={clp(s.result)} tone={s.result > 0 ? "good" : s.result < 0 ? "bad" : undefined}>
          Ingresos netos {clp(s.netIncome)} − gastos netos {clp(s.netExpenses)}
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">IVA del período (estimado)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {clp(Math.abs(s.iva.balance))} <span className="text-base font-normal text-zinc-600">{ivaDue ? "a pagar" : "de remanente"}</span>
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-zinc-500">Débito (ventas e ingresos)</dt>
            <dd className="text-right tabular-nums">{clp(s.iva.debit)}</dd>
            <dt className="text-zinc-500">Crédito (facturas de compra)</dt>
            <dd className="text-right tabular-nums">− {clp(s.iva.credit)}</dd>
          </dl>
          <p className="mt-2 text-xs text-zinc-500">Referencial para el F29: asume que todo lo vendido está afecto a IVA (19%). Confírmalo con tu contador.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Margen de los productos vendidos online</p>
          {s.margin.revenue > 0 ? (
            <>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {clp(s.margin.profit)} <span className="text-base font-normal text-zinc-600">({s.margin.percent}%)</span>
              </p>
              <p className="mt-2 text-sm text-zinc-600">Vendido {clp(s.margin.revenue)} con un costo de {clp(s.margin.cost)}.</p>
            </>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-zinc-400">—</p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {s.margin.unitsWithoutCost > 0
              ? `${s.margin.unitsWithoutCost} unidades vendidas no tienen costo: ingrésalo en Inventario para incluirlas.`
              : "Usa el costo actual de cada variante (se ingresa en Inventario)."}
          </p>
        </div>
      </div>
    </div>
  );
}
