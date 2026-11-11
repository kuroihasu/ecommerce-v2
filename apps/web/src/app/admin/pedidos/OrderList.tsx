"use client";

import { useState, useTransition } from "react";
import { issueReceipt, updateOrder } from "@/lib/admin/actions";
import type { AdminOrder, OrderStatus } from "@/lib/admin/types";
import { useTwoFactor } from "../StepUp";

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;
const date = (iso: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }).format(new Date(iso));

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "Por pagar", cls: "bg-amber-100 text-amber-900" },
  PAID: { label: "Pagado · por despachar", cls: "bg-emerald-100 text-emerald-900" },
  FULFILLED: { label: "Despachado", cls: "bg-sky-100 text-sky-900" },
  DELIVERED: { label: "Entregado", cls: "bg-zinc-100 text-zinc-700" },
  CANCELLED: { label: "Anulado", cls: "bg-zinc-100 text-zinc-500 line-through" },
  REFUNDED: { label: "Devuelto", cls: "bg-zinc-100 text-zinc-500" },
};
const METHOD = { webpay: "Webpay", mercadopago: "Mercado Pago", transfer: "Transferencia" } as const;
const PAY = { PENDING: "pendiente", AUTHORIZED: "aprobado", FAILED: "no se completó", REFUNDED: "devuelto" } as const;

const FILTERS: { id: OrderStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "PAID", label: "Por despachar" },
  { id: "PENDING", label: "Por pagar" },
  { id: "FULFILLED", label: "Despachados" },
  { id: "DELIVERED", label: "Entregados" },
  { id: "CANCELLED", label: "Anulados" },
];

function Detail({ o, onChange }: { o: AdminOrder; onChange: (o: AdminOrder) => void }) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const withTwoFactor = useTwoFactor();
  const a = o.shippingAddress;
  const pay = o.payments[0];
  const act = (status: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      setMsg(null);
      // Marcar pagado o anular piden el código de 2FA (la API decide; aquí se pide si hace falta).
      const r = await withTwoFactor(() => updateOrder(o.id, { status, ...(status === "FULFILLED" ? { carrier, trackingNumber: tracking } : {}) }));
      if (r.ok) onChange(r.data);
      else setMsg(r.error);
    });
  };
  const issue = () =>
    start(async () => {
      setMsg(null);
      const r = await issueReceipt(o.id);
      if (!r.ok) return setMsg(r.error);
      onChange({ ...o, dte: { id: r.data.id, type: r.data.type, folio: r.data.folio, status: r.data.status, test: r.data.test, error: r.data.error } });
      if (r.data.status === "FAILED") setMsg(`La boleta no se emitió: ${r.data.error}`);
    });
  const sold = ["PAID", "FULFILLED", "DELIVERED"].includes(o.status);
  const raw = pay?.raw as { authorizationCode?: string; card?: string; installments?: number; mpId?: string; manual?: boolean } | null;

  return (
    <div className="grid gap-5 border-t border-zinc-100 bg-zinc-50/60 p-4 text-sm md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Cliente</p>
        <p>{a.name}{a.rut ? ` · ${a.rut}` : ""}</p>
        <p><a className="underline" href={`mailto:${o.email}`}>{o.email}</a>{a.phone ? <> · <a className="underline" href={`tel:${a.phone}`}>{a.phone}</a></> : null}</p>
        <p className="mt-2 font-semibold">Despacho</p>
        <p>{[a.street, a.number, a.apartment].filter(Boolean).join(" ")}</p>
        <p>{a.comuna}, {a.region === "Metropolitana" ? "Región Metropolitana" : a.region}</p>
        {o.shipments[0] && <p className="mt-1">Enviado por {o.shipments[0].carrier}{o.shipments[0].trackingNumber ? ` · seguimiento ${o.shipments[0].trackingNumber}` : ""}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Productos</p>
        <ul>
          {o.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span>{i.quantity} × {i.name}{i.sku ? ` (${i.sku})` : ""}</span><span className="tabular-nums">{clp(i.unitPrice * i.quantity)}</span></li>)}
        </ul>
        <dl className="mt-1 border-t border-zinc-200 pt-1">
          {o.discountTotal > 0 && <div className="flex justify-between"><dt>Descuento {o.discountCode}</dt><dd>−{clp(o.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>Envío</dt><dd>{o.shippingTotal ? clp(o.shippingTotal) : "Gratis"}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{clp(o.total)}</dd></div>
        </dl>
        {pay && (
          <p className="mt-2">
            Pago: {METHOD[pay.method]} {PAY[pay.status]}
            {raw?.authorizationCode ? ` · autorización ${raw.authorizationCode}` : ""}
            {raw?.card ? ` · tarjeta ****${raw.card}` : ""}
            {raw?.installments ? ` · ${raw.installments} cuotas` : ""}
            {raw?.mpId ? ` · operación ${raw.mpId}` : ""}
            {raw?.manual ? " · confirmado a mano" : ""}
          </p>
        )}
      </div>
      {sold && (
        <p className="flex flex-wrap items-center gap-2 md:col-span-2">
          <span className="font-semibold">Boleta:</span>
          {o.dte?.status === "ISSUED" ? (
            <>
              <span>{o.dte.type === 41 ? "Boleta exenta" : "Boleta electrónica"}{o.dte.folio ? ` N° ${o.dte.folio}` : ""}{o.dte.test ? " (prueba, no válida ante el SII)" : ""}</span>
              <a href={`/admin/boletas/${o.dte.id}/pdf`} target="_blank" rel="noopener" className="underline">Ver PDF</a>
            </>
          ) : o.dte?.status === "ISSUING" ? (
            <span>emitiéndose…</span>
          ) : (
            <>
              <span className={o.dte ? "text-red-800" : "text-zinc-600"}>{o.dte ? `no se emitió${o.dte.error ? ` (${o.dte.error})` : ""}` : "sin boleta"}</span>
              <button disabled={pending} onClick={issue} className="h-8 rounded-lg border border-zinc-300 bg-white px-3 disabled:opacity-60">{o.dte ? "Reintentar" : "Emitir boleta"}</button>
            </>
          )}
        </p>
      )}
      {o.notes && <p className="whitespace-pre-line rounded-lg bg-white p-3 ring-1 ring-zinc-200 md:col-span-2">{o.notes}</p>}
      <div className="flex flex-wrap items-end gap-2 md:col-span-2">
        {o.status === "PENDING" && (
          <>
            <button disabled={pending} onClick={() => act("PAID", `¿Confirmas que recibiste ${clp(o.total)} del pedido #${o.number}? Se descontará el stock.`)} className="h-10 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-60">Marcar como pagado</button>
            <button disabled={pending} onClick={() => act("CANCELLED", `¿Anular el pedido #${o.number}?`)} className="h-10 rounded-lg border border-zinc-300 px-4 disabled:opacity-60">Anular</button>
          </>
        )}
        {o.status === "PAID" && (
          <>
            <label className="flex flex-col gap-1">
              Empresa de envío
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} list="carriers" maxLength={40} className="h-10 w-44 rounded-lg border border-zinc-300 bg-white px-3" />
              <datalist id="carriers">{["Starken", "Chilexpress", "Blue Express", "Correos de Chile", "Envío propio", "Retiro en tienda"].map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className="flex flex-col gap-1">
              N° de seguimiento <span className="sr-only">opcional</span>
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={60} className="h-10 w-44 rounded-lg border border-zinc-300 bg-white px-3" />
            </label>
            <button disabled={pending} onClick={() => act("FULFILLED")} className="h-10 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-60">Marcar como despachado</button>
          </>
        )}
        {o.status === "FULFILLED" && <button disabled={pending} onClick={() => act("DELIVERED")} className="h-10 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-60">Marcar como entregado</button>}
        {msg && <p role="status" className="text-red-700">{msg}</p>}
      </div>
    </div>
  );
}

export function OrderList({ initial }: { initial: AdminOrder[] }) {
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const shown = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);
  const count = (id: OrderStatus | "ALL") => (id === "ALL" ? orders.length : orders.filter((o) => o.status === id).length);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 p-2" role="tablist" aria-label="Filtrar pedidos">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${filter === f.id ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>
            {f.label} <span className="opacity-60">{count(f.id)}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500">{orders.length ? "No hay pedidos en esta lista." : "Todavía no hay pedidos. Aparecerán aquí apenas un cliente compre."}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {shown.map((o) => (
            <li key={o.id}>
              <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-zinc-50 md:grid-cols-[80px_1fr_160px_110px_200px]">
                <span className="font-semibold">#{o.number}</span>
                <span className="min-w-0 truncate">{o.shippingAddress.name ?? o.email}<span className="block text-xs text-zinc-500 md:hidden">{date(o.createdAt)} · {o.payments[0] ? METHOD[o.payments[0].method] : ""}</span></span>
                <span className="hidden text-sm text-zinc-500 md:block">{date(o.createdAt)}</span>
                <span className="text-right font-medium tabular-nums md:text-left">{clp(o.total)}</span>
                <span className="col-span-3 md:col-span-1">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                  {o.payments[0] && <span className="ml-2 hidden text-xs text-zinc-500 md:inline">{METHOD[o.payments[0].method]}</span>}
                  {o.notes?.includes("⚠") && <span className="ml-2 text-xs text-amber-700" title="Revisar notas">⚠ revisar</span>}
                </span>
              </button>
              {open === o.id && (
                <Detail
                  o={o}
                  onChange={(n) => {
                    setOrders((cur) => cur.map((x) => (x.id === n.id ? n : x)));
                    // Si cambió de lista, se muestra en "Todos" para no perderlo de vista.
                    if (filter !== "ALL" && n.status !== filter) setFilter("ALL");
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
