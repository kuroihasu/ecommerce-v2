"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryPayment, type Method, type PublicOrder } from "@/lib/orders";
import { formatCLP } from "./catalog";
import { useCatalogData } from "./CatalogProvider";
import { useCart } from "./cart";
import { METHOD_INFO } from "./checkout";
import { goToGateway } from "./Checkout";
import { trackPurchase } from "./tracking";

// Página del pedido después de pagar (o de elegir transferencia). Muestra si quedó
// pagado, los datos para transferir, o permite reintentar el pago.
export function OrderView({ order, orderKey }: { order: PublicOrder; orderKey: string }) {
  const cart = useCart("tienda");
  const { store } = useCatalogData();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const gateway = useRef<HTMLFormElement>(null);

  const paid = ["PAID", "FULFILLED", "DELIVERED"].includes(order.status);
  const waitingTransfer = order.status === "PENDING" && Boolean(order.transfer);
  const failed = order.status === "PENDING" && order.payment?.status === "FAILED";
  const checking = order.status === "PENDING" && order.payment?.pending;

  // Pedido hecho: se vacía el carrito y se avisa la compra a los píxeles (una vez).
  const clear = cart.clear;
  const hasLines = cart.lines.length > 0;
  useEffect(() => {
    if (!paid && !waitingTransfer) return;
    if (hasLines) clear();
    if (!paid) return;
    const flag = `compra:${order.id}`;
    try {
      if (localStorage.getItem(flag)) return;
      localStorage.setItem(flag, "1");
    } catch {}
    trackPurchase(order.number, order.total, order.items.map((i) => ({ id: i.variantId ?? i.name, name: i.name, price: i.unitPrice, qty: i.quantity })));
  }, [paid, waitingTransfer, hasLines, clear, order]);

  const retry = (m: Method) =>
    start(async () => {
      setError(null);
      const r = await retryPayment(order.id, orderKey, m);
      if (!r.ok) return setError(r.error);
      if (r.redirect) goToGateway(r.redirect, gateway.current);
      else router.refresh();
    });

  const others = order.methods ? (Object.keys(METHOD_INFO) as Method[]).filter((m) => order.methods![m]) : [];

  return (
    <div className="flex flex-col gap-10 pt-12">
      <header className="flex flex-col gap-3">
        <p className="text-lg opacity-70">Pedido #{order.number}</p>
        <h1 className="font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-none">
          {paid ? "¡Gracias por tu compra!" : waitingTransfer ? "Falta tu transferencia" : failed ? "El pago no se completó" : order.status === "CANCELLED" ? "Pedido anulado" : checking ? "Estamos confirmando tu pago" : "Pedido pendiente de pago"}
        </h1>
        <p className="max-w-2xl text-lg">
          {paid
            ? `Recibimos tu pago. Te escribiremos a ${order.email} cuando despachemos tu pedido.`
            : waitingTransfer
              ? "Transfiere el total a la cuenta de abajo y envíanos el comprobante. Despachamos cuando veamos el depósito."
              : failed
                ? "No se hizo ningún cargo. Puedes intentarlo de nuevo o elegir otro medio de pago."
                : checking
                  ? "La pasarela todavía no confirma el pago. Recarga esta página en unos minutos."
                  : order.status === "CANCELLED"
                    ? "Este pedido fue anulado. Si crees que es un error, escríbenos."
                    : "Elige cómo quieres pagar."}
        </p>
      </header>

      {waitingTransfer && order.transfer && (
        <section className="rounded-brand bg-field p-6 text-field-ink">
          <h2 className="mb-4 text-2xl">Datos para transferir</h2>
          <dl className="grid gap-x-6 gap-y-2 text-lg sm:grid-cols-[auto_1fr]">
            <dt className="opacity-70">Monto</dt><dd className="font-semibold tabular-nums">{formatCLP(order.total)}</dd>
            <dt className="opacity-70">Banco</dt><dd>{order.transfer.bank}</dd>
            {order.transfer.accountType && <><dt className="opacity-70">Tipo de cuenta</dt><dd>{order.transfer.accountType}</dd></>}
            <dt className="opacity-70">Número</dt><dd className="tabular-nums">{order.transfer.accountNumber}</dd>
            <dt className="opacity-70">Titular</dt><dd>{order.transfer.holder}</dd>
            <dt className="opacity-70">RUT</dt><dd>{order.transfer.rut}</dd>
            {order.transfer.email && <><dt className="opacity-70">Comprobante a</dt><dd>{order.transfer.email}</dd></>}
            <dt className="opacity-70">Asunto</dt><dd>Pedido #{order.number}</dd>
          </dl>
        </section>
      )}

      {order.status === "PENDING" && !checking && (failed || !waitingTransfer) && others.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl">{failed ? "Intentar de nuevo" : "Pagar"}</h2>
          <div className="flex flex-wrap gap-3">
            {others.map((m) => (
              <button key={m} disabled={pending} onClick={() => retry(m)} className="h-12 rounded-brand bg-ink px-6 text-base text-bg disabled:opacity-60">
                {m === "transfer" ? "Pagar por transferencia" : `Pagar con ${METHOD_INFO[m].label}`}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="text-base">{error}</p>}
        </section>
      )}
      {waitingTransfer && others.some((m) => m !== "transfer") && (
        <p className="-mt-6 text-base">
          ¿Prefieres pagar con tarjeta?{" "}
          {others.filter((m) => m !== "transfer").map((m) => (
            <button key={m} disabled={pending} onClick={() => retry(m)} className="mr-3 underline">Pagar con {METHOD_INFO[m].label}</button>
          ))}
        </p>
      )}

      <section className="rounded-brand bg-surface p-6">
        <h2 className="mb-4 text-2xl">Resumen</h2>
        <ul className="flex flex-col gap-2 text-lg">
          {order.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-4"><span>{i.quantity} × {i.name}</span><span className="tabular-nums">{formatCLP(i.unitPrice * i.quantity)}</span></li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-1 border-t border-ink/10 pt-4 text-lg">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCLP(order.subtotal)}</dd></div>
          {order.discountTotal > 0 && <div className="flex justify-between"><dt>Descuento {order.discountCode}</dt><dd className="tabular-nums">−{formatCLP(order.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>Envío</dt><dd className="tabular-nums">{order.shippingTotal ? formatCLP(order.shippingTotal) : "Gratis"}</dd></div>
          <div className="mt-2 flex justify-between text-2xl"><dt>Total</dt><dd className="tabular-nums">{formatCLP(order.total)}</dd></div>
        </dl>
        <p className="mt-4 text-base opacity-80">
          Despacho a {order.address.name}: {order.address.line}, {order.address.comuna}, {order.address.region === "Metropolitana" ? "Región Metropolitana" : order.address.region}.
        </p>
      </section>

      <p className="text-base">
        Guarda este enlace para revisar tu pedido. ¿Dudas? Escríbenos{store.email ? ` a ${store.email}` : ""} con el número de pedido.{" "}
        <Link href="/" className="underline">Seguir comprando</Link>
      </p>
      <form ref={gateway} method="POST" className="hidden" aria-hidden />
    </div>
  );
}
