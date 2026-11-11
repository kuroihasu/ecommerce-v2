"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adjustStock, saveEntry, saveStore, setVariantCost } from "@/lib/admin/actions";
import { clp, downloadCsv } from "@/lib/admin/csv";
import type { InventoryItem, StockMovement, StockReason } from "@/lib/admin/types";
import { normalize } from "@/designs/useCatalog";

const TZ = "America/Santiago";
const when = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;
const ivaOf = (total: number) => Math.round((total * 0.19) / 1.19);

// Cómo se mueve el stock según el motivo: sumar, restar o fijar lo contado.
const REASONS: { id: StockReason | "COUNT"; label: string; sign: 1 | -1 | 0 }[] = [
  { id: "RESTOCK", label: "Llegó mercadería", sign: 1 },
  { id: "SALE", label: "Venta fuera de la web", sign: -1 },
  { id: "RETURN", label: "Devolución de cliente", sign: 1 },
  { id: "LOSS", label: "Pérdida, daño o robo", sign: -1 },
  { id: "COUNT", label: "Conteo físico (fijar stock)", sign: 0 },
];
export const REASON_LABEL: Record<StockReason, string> = { RESTOCK: "Llegó mercadería", SALE: "Venta", RETURN: "Devolución", LOSS: "Pérdida", ADJUSTMENT: "Ajuste" };

type Filter = "" | "low" | "out" | "nocost";

export function InventoryManager({ initial, threshold: initialThreshold, movements: initialMoves }: { initial: InventoryItem[]; threshold: number; movements: StockMovement[] }) {
  const [items, setItems] = useState(initial);
  const [moves, setMoves] = useState(initialMoves);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [historyOf, setHistoryOf] = useState<InventoryItem | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const visible = items.filter((i) => archived || i.status !== "ARCHIVED");
  const isLow = (i: InventoryItem) => i.stock > 0 && i.stock <= threshold;
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const list = visible.filter(
    (i) =>
      (filter !== "low" || isLow(i)) &&
      (filter !== "out" || i.stock === 0) &&
      (filter !== "nocost" || i.cost === null) &&
      words.every((w) => normalize(`${i.productName} ${i.name} ${i.sku ?? ""}`).includes(w)),
  );

  const units = visible.reduce((s, i) => s + i.stock, 0);
  const costValue = visible.reduce((s, i) => s + (i.cost ?? 0) * i.stock, 0);
  const priceValue = visible.reduce((s, i) => s + i.price * i.stock, 0);
  const missingCost = visible.filter((i) => i.cost === null && i.stock > 0).length;
  const low = visible.filter(isLow).length;
  const out = visible.filter((i) => i.stock === 0 && i.status === "ACTIVE").length;

  const patch = (variantId: string, p: Partial<InventoryItem>) => setItems((all) => all.map((i) => (i.variantId === variantId ? { ...i, ...p } : i)));

  const exportCsv = () =>
    downloadCsv(`inventario-${today()}.csv`, [
      ["producto", "variante", "sku", "estado", "stock", "costo_unitario", "precio", "valor_costo", "valor_venta"],
      ...visible.map((i) => [i.productName, i.name, i.sku, i.status, i.stock, i.cost, i.price, i.cost === null ? null : i.cost * i.stock, i.price * i.stock]),
    ]);

  const saveThreshold = async (n: number) => {
    const res = await saveStore({ settings: { lowStockThreshold: n } });
    setNotice(res.ok ? { tone: "ok", text: `Te avisamos cuando una variante tenga ${n} unidades o menos.` } : { tone: "error", text: res.error });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Unidades en stock" value={units.toLocaleString("es-CL")} hint={`${visible.length} variantes`} />
        <Stat label="Valor a costo" value={clp(costValue)} hint={missingCost ? `${missingCost} variantes con stock sin costo` : "Todas con costo"} warn={missingCost > 0} />
        <Stat label="Valor a precio de venta" value={clp(priceValue)} hint={costValue && priceValue ? `Ganancia posible ${clp(priceValue - costValue)}` : undefined} />
        <Stat label="Por reponer" value={`${low + out}`} hint={`${low} con stock bajo · ${out} agotadas`} warn={low + out > 0} />
      </div>

      {notice && (
        <p role="status" className={`rounded-lg px-4 py-3 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {notice.text}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por producto, talla o SKU" aria-label="Buscar en el inventario" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtrar" className="h-10 rounded-lg border border-zinc-300 bg-white px-3">
            <option value="">Todas las variantes</option>
            <option value="low">Stock bajo ({low})</option>
            <option value="out">Agotadas</option>
            <option value="nocost">Sin costo</option>
          </select>
          <label className="flex items-center gap-2 px-1 text-sm text-zinc-600">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="h-4 w-4 accent-zinc-900" />
            Archivados
          </label>
          <button type="button" onClick={exportCsv} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Descargar CSV</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          <label htmlFor="threshold">Avisar stock bajo con</label>
          <input
            id="threshold"
            inputMode="numeric"
            value={threshold}
            onChange={(e) => setThreshold(num(e.target.value))}
            onBlur={() => threshold !== initialThreshold && saveThreshold(threshold)}
            className="h-8 w-14 rounded-md border border-zinc-300 bg-white px-2 text-center"
          />
          <span>unidades o menos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-zinc-100">
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Stock</th>
                <th className="px-3 py-2 text-right font-medium">Costo</th>
                <th className="px-3 py-2 text-right font-medium">Precio</th>
                <th className="px-3 py-2 text-right font-medium">Margen</th>
                <th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((i) => (
                <Row
                  key={i.variantId}
                  item={i}
                  low={isLow(i)}
                  open={open === i.variantId}
                  onToggle={() => setOpen(open === i.variantId ? null : i.variantId)}
                  onHistory={() => setHistoryOf(i)}
                  onCost={async (cost) => {
                    const prev = i.cost;
                    patch(i.variantId, { cost });
                    const res = await setVariantCost(i.variantId, cost);
                    if (!res.ok) {
                      patch(i.variantId, { cost: prev });
                      setNotice({ tone: "error", text: res.error });
                    }
                  }}
                  onAdjusted={(stock, movement, text) => {
                    patch(i.variantId, { stock });
                    setMoves((m) => [movement, ...m]);
                    setOpen(null);
                    setNotice({ tone: "ok", text });
                  }}
                  onError={(text) => setNotice({ tone: "error", text })}
                />
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-zinc-500">{items.length ? "No hay variantes que coincidan." : "Aún no tienes productos."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <History moves={historyOf ? moves.filter((m) => m.variantId === historyOf.variantId) : moves} of={historyOf} onClear={() => setHistoryOf(null)} />
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className={`mt-1 text-xs ${warn ? "text-amber-700" : "text-zinc-500"}`}>{hint}</p>}
    </div>
  );
}

function Row({
  item: i,
  low,
  open,
  onToggle,
  onHistory,
  onCost,
  onAdjusted,
  onError,
}: {
  item: InventoryItem;
  low: boolean;
  open: boolean;
  onToggle: () => void;
  onHistory: () => void;
  onCost: (cost: number | null) => void;
  onAdjusted: (stock: number, movement: StockMovement, text: string) => void;
  onError: (text: string) => void;
}) {
  const [cost, setCost] = useState(i.cost === null ? "" : String(i.cost));
  const margin = i.cost !== null && i.price > 0 ? Math.round(((i.price - i.cost) / i.price) * 100) : null;
  const badge = i.stock === 0 ? "bg-red-100 text-red-800" : low ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-800";
  return (
    <>
      <tr className={i.status === "ARCHIVED" ? "opacity-60" : ""}>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del panel */}
            {i.image ? <img src={i.image} alt="" className="size-10 shrink-0 rounded-md bg-zinc-100 object-cover" loading="lazy" /> : <span className="size-10 shrink-0 rounded-md bg-zinc-100" />}
            <div className="min-w-0">
              <Link href={`/admin/productos/${i.productId}`} className="block truncate font-medium hover:underline">{i.productName}</Link>
              <span className="block truncate text-zinc-500">{i.name === "Default" ? "Única" : i.name}{i.status !== "ACTIVE" && ` · ${i.status === "DRAFT" ? "Borrador" : "Archivado"}`}</span>
            </div>
          </div>
        </td>
        <td className="max-w-40 truncate whitespace-nowrap px-3 py-2.5 font-mono text-xs text-zinc-600" title={i.sku ?? undefined}>{i.sku ?? "—"}</td>
        <td className="px-3 py-2.5 text-right">
          <span className={`inline-block min-w-12 rounded-full px-2.5 py-1 text-center text-xs font-semibold tabular-nums ${badge}`}>{i.stock}</span>
        </td>
        <td className="px-3 py-2.5 text-right">
          <input
            inputMode="numeric"
            value={cost}
            placeholder="—"
            onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              const next = cost === "" ? null : Number(cost);
              if (next !== i.cost) onCost(next);
            }}
            aria-label={`Costo de ${i.productName} ${i.name}`}
            className="h-8 w-24 rounded-md border border-zinc-200 px-2 text-right tabular-nums hover:border-zinc-300 focus:border-zinc-400"
          />
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{clp(i.price)}</td>
        <td className={`px-3 py-2.5 text-right tabular-nums ${margin !== null && margin < 0 ? "text-red-700" : ""}`}>{margin === null ? "—" : `${margin}%`}</td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex justify-end gap-1">
            <button type="button" onClick={onHistory} className="h-8 rounded-md px-2 text-zinc-600 hover:bg-zinc-100">Historial</button>
            <button type="button" onClick={onToggle} aria-expanded={open} className={`h-8 rounded-md px-3 font-medium ${open ? "bg-zinc-900 text-white" : "border border-zinc-300 hover:bg-zinc-50"}`}>Ajustar</button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-zinc-50">
          <td colSpan={7} className="px-3 py-3">
            <AdjustForm item={i} onDone={onAdjusted} onError={onError} />
          </td>
        </tr>
      )}
    </>
  );
}

function AdjustForm({ item, onDone, onError }: { item: InventoryItem; onDone: (stock: number, movement: StockMovement, text: string) => void; onError: (text: string) => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]["id"]>("RESTOCK");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [record, setRecord] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const r = REASONS.find((x) => x.id === reason)!;
  const n = num(qty);
  const after = r.sign === 0 ? n : item.stock + r.sign * n;
  const saleTotal = n * item.price;

  const submit = () =>
    start(async () => {
      setError("");
      if (qty === "" || (r.sign !== 0 && n === 0)) return setError("Escribe la cantidad.");
      const res = await adjustStock({
        variantId: item.variantId,
        reason: reason === "COUNT" ? "ADJUSTMENT" : reason,
        ...(r.sign === 0 ? { stock: n } : { delta: r.sign * n }),
        note: note.trim() || (reason === "COUNT" ? "Conteo físico" : undefined),
      });
      if (!res.ok) return setError(res.error);
      let text = `${item.productName} · ${item.name}: quedan ${res.data.stock} unidades.`;
      // Una venta fuera de la web también se anota como ingreso (boleta con IVA incluido).
      if (reason === "SALE" && record && saleTotal > 0) {
        const entry = await saveEntry(null, {
          kind: "INCOME",
          date: today(),
          category: "Ventas fuera de la web",
          description: `${n} × ${item.productName} (${item.name})${note.trim() ? ` · ${note.trim()}` : ""}`,
          amount: saleTotal,
          taxAmount: ivaOf(saleTotal),
          document: "BOLETA",
          documentNumber: null,
          counterparty: null,
          counterpartyRut: null,
        });
        if (entry.ok) text += ` Se anotó la venta por ${clp(saleTotal)} en Contabilidad.`;
        else onError(`El stock se descontó, pero la venta no se anotó en Contabilidad: ${entry.error}`);
      }
      onDone(res.data.stock, res.data.movement, text);
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Motivo
          <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal">
            {REASONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {r.sign === 0 ? "Unidades contadas" : r.sign > 0 ? "Unidades que entran" : "Unidades que salen"}
          <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} autoFocus className="h-10 w-28 rounded-lg border border-zinc-300 bg-white px-3 font-normal tabular-nums" />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium">
          Nota (opcional)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={reason === "RESTOCK" ? "Proveedor o n° de factura" : reason === "SALE" ? "Instagram, feria, local…" : ""} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal" />
        </label>
        <button type="button" onClick={submit} disabled={pending} className="h-10 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
      </div>
      <p className={`text-sm ${after < 0 ? "text-red-700" : "text-zinc-600"}`}>
        Stock actual {item.stock} → {qty === "" ? "…" : after < 0 ? `no alcanza (hay ${item.stock})` : after}
      </p>
      {reason === "SALE" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} className="h-4 w-4 accent-zinc-900" />
          Anotar también como ingreso en Contabilidad{n > 0 && ` (${clp(saleTotal)} a precio de lista)`}
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function History({ moves, of, onClear }: { moves: StockMovement[]; of: InventoryItem | null; onClear: () => void }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Historial de movimientos</h2>
          <p className="text-sm text-zinc-500">{of ? `${of.productName} · ${of.name}` : "Los últimos cambios de stock de toda la tienda."}</p>
        </div>
        <div className="flex gap-2">
          {of && <button type="button" onClick={onClear} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Ver todo</button>}
          {moves.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(`movimientos-stock-${today()}.csv`, [["fecha", "producto", "sku", "motivo", "cambio", "stock_final", "nota"], ...moves.map((m) => [m.createdAt, m.label, m.sku, REASON_LABEL[m.reason], m.delta, m.stockAfter, m.note])])}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50"
            >
              Descargar CSV
            </button>
          )}
        </div>
      </div>
      {moves.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Todavía no hay movimientos. Cada vez que ajustes el stock aquí o en la ficha de un producto, quedará anotado.</p>
      ) : (
        <div className="mt-4 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Producto</th>
                <th className="py-2 pr-3 font-medium">Motivo</th>
                <th className="py-2 pr-3 text-right font-medium">Cambio</th>
                <th className="py-2 pr-3 text-right font-medium">Quedó</th>
                <th className="py-2 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">{when(m.createdAt)}</td>
                  <td className="py-2.5 pr-3">{m.label}</td>
                  <td className="py-2.5 pr-3">{REASON_LABEL[m.reason]}</td>
                  <td className={`py-2.5 pr-3 text-right font-medium tabular-nums ${m.delta > 0 ? "text-emerald-700" : "text-red-700"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{m.stockAfter}</td>
                  <td className="py-2.5 text-zinc-600">{m.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
