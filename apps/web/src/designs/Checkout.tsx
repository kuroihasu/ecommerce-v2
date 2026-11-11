"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkDiscount } from "@/lib/discounts";
import { startCheckout, type Method, type Methods, type Redirect } from "@/lib/orders";
import { formatCLP } from "./catalog";
import { useCatalogData } from "./CatalogProvider";
import { useCart } from "./cart";
import { METHOD_INFO, REGIONS, computeTotals, type CodeInfo } from "./checkout";
import { Photo } from "./Photo";

const SAVED = "checkout:datos";
const noop = () => () => {};
const field = "h-12 w-full rounded-brand border border-ink/15 bg-bg px-4 text-base text-ink placeholder:text-ink/40";
const label = "flex flex-col gap-1.5 text-base";

type Data = { email: string; phone: string; name: string; rut: string; region: string; comuna: string; street: string; number: string; apartment: string; notes: string };
const EMPTY: Data = { email: "", phone: "", name: "", rut: "", region: "Metropolitana", comuna: "", street: "", number: "", apartment: "", notes: "" };

// Lleva al cliente a la pasarela: Webpay recibe el token por POST; Mercado Pago, por GET.
export function goToGateway(r: Exclude<Redirect, null>, form: HTMLFormElement | null) {
  if (r.method === "GET") return window.location.assign(r.url);
  if (!form) return;
  form.action = r.url;
  form.replaceChildren(
    ...Object.entries(r.fields).map(([k, v]) => Object.assign(document.createElement("input"), { type: "hidden", name: k, value: v })),
  );
  form.submit();
}

export function Checkout({ methods, initialCode, initialRegion }: { methods: Methods; initialCode: string; initialRegion: "rm" | "regiones" }) {
  const cart = useCart("tienda");
  const { store } = useCatalogData();
  const router = useRouter();
  const [d, setD] = useState<Data>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED) ?? "null") as Partial<Data> | null;
      return { ...EMPTY, ...saved, region: saved?.region ?? (initialRegion === "regiones" ? "" : "Metropolitana"), notes: "" };
    } catch {
      return EMPTY;
    }
  });
  const available = (Object.keys(METHOD_INFO) as Method[]).filter((m) => methods[m]);
  const [method, setMethod] = useState<Method | null>(available[0] ?? null);
  const [code, setCode] = useState<CodeInfo | null>(null);
  const [codeInput, setCodeInput] = useState(initialCode);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const gateway = useRef<HTMLFormElement>(null);
  const set = (k: keyof Data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD((cur) => ({ ...cur, [k]: e.target.value }));

  const applyCode = (raw: string) =>
    start(async () => {
      const r = await checkDiscount(raw);
      setCode(r.ok ? { code: r.code, kind: r.kind, percent: r.percent, minSubtotal: r.minSubtotal } : null);
      setCodeMsg(r.ok ? null : r.error);
    });

  // El código que venía aplicado desde el carrito se vuelve a revisar.
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || !initialCode) return;
    checked.current = true;
    applyCode(initialCode);
  }, [initialCode]);

  // En el servidor el carrito está vacío (vive en el navegador): se espera a leerlo.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const t = computeTotals(cart.subtotal, d.region, store, code);
  const shortBy = code && !t.active ? code.minSubtotal - cart.subtotal : 0;

  if (!hydrated) return <div className="min-h-[60vh]" aria-busy />;
  if (cart.lines.length === 0 && !leaving) {
    return (
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="text-2xl">Tu carrito está vacío.</p>
        <Link href="/catalogo" className="rounded-brand bg-accent px-8 py-4 text-lg text-accent-ink">Ver el catálogo</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) return;
    setError(null);
    try {
      localStorage.setItem(SAVED, JSON.stringify({ ...d, notes: "" }));
    } catch {}
    start(async () => {
      const r = await startCheckout({
        items: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        email: d.email,
        name: d.name,
        phone: d.phone,
        rut: d.rut,
        address: { region: d.region, comuna: d.comuna, street: d.street, number: d.number, apartment: d.apartment },
        notes: d.notes,
        code: t.active?.code,
        method,
      });
      if (!r.ok) return setError(r.error);
      setLeaving(true);
      if (r.redirect) goToGateway(r.redirect, gateway.current);
      else router.push(`/pedido/${encodeURIComponent(r.orderId)}?k=${encodeURIComponent(r.key)}`);
    });
  };

  return (
    <>
    <form onSubmit={submit} className="grid gap-10 pb-20 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-10">
        {methods.test && (
          <p className="rounded-brand border border-ink/20 bg-surface px-4 py-3 text-base">
            <strong>Pagos en modo de prueba:</strong> no se cobra dinero real. Usa las tarjetas de prueba de la pasarela.
          </p>
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 text-2xl">Contacto</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Correo
              <input className={field} type="email" required autoComplete="email" value={d.email} onChange={set("email")} maxLength={254} />
            </label>
            <label className={label}>
              Teléfono
              <input className={field} type="tel" required autoComplete="tel" value={d.phone} onChange={set("phone")} placeholder="+56 9 1234 5678" maxLength={20} />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 text-2xl">Despacho</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Nombre y apellido
              <input className={field} required autoComplete="name" value={d.name} onChange={set("name")} maxLength={100} />
            </label>
            <label className={label}>
              RUT <span className="text-sm text-ink/60">opcional, para la boleta</span>
              <input className={field} value={d.rut} onChange={set("rut")} placeholder="12.345.678-9" maxLength={12} />
            </label>
            <label className={label}>
              Región
              <select className={field} required value={d.region} onChange={set("region")} autoComplete="address-level1">
                <option value="" disabled>Elige tu región</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r === "Metropolitana" ? "Región Metropolitana" : r}</option>)}
              </select>
            </label>
            <label className={label}>
              Comuna
              <input className={field} required autoComplete="address-level2" value={d.comuna} onChange={set("comuna")} maxLength={60} />
            </label>
            <div className="grid grid-cols-[1fr_120px] gap-4 sm:col-span-2">
              <label className={label}>
                Calle
                <input className={field} required autoComplete="address-line1" value={d.street} onChange={set("street")} maxLength={120} />
              </label>
              <label className={label}>
                Número
                <input className={field} required value={d.number} onChange={set("number")} maxLength={20} inputMode="numeric" />
              </label>
            </div>
            <label className={label}>
              Depto, casa u oficina <span className="text-sm text-ink/60">opcional</span>
              <input className={field} autoComplete="address-line2" value={d.apartment} onChange={set("apartment")} maxLength={40} />
            </label>
            <label className={label}>
              Indicaciones <span className="text-sm text-ink/60">opcional</span>
              <input className={field} value={d.notes} onChange={set("notes")} maxLength={300} placeholder="Ej: dejar en conserjería" />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-4 text-2xl">Pago</legend>
          {available.length === 0 && (
            <p className="rounded-brand bg-surface p-4 text-base">
              La tienda todavía no activa los pagos en línea. {store.whatsapp || store.email ? `Escríbenos a ${store.whatsapp || store.email} para comprar.` : ""}
            </p>
          )}
          {available.map((m) => (
            <label key={m} className={`flex cursor-pointer items-start gap-4 rounded-brand border p-4 transition-colors ${method === m ? "border-ink bg-surface" : "border-ink/15"}`}>
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="mt-1 h-5 w-5 accent-[var(--ink)]" />
              <span className="flex flex-col gap-1">
                <span className="text-lg">{METHOD_INFO[m].label}</span>
                <span className="text-base text-ink/70">{METHOD_INFO[m].hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      <aside className="flex h-fit flex-col gap-5 rounded-brand bg-field p-6 text-field-ink lg:sticky lg:top-28">
        <h2 className="text-2xl">Tu pedido</h2>
        <ul className="flex flex-col gap-3">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
              <Photo name={l.product.image} alt="" sizes="56px" className="aspect-[3/4] rounded-brand" />
              <span className="flex flex-col text-base leading-tight">
                <span>{l.product.name}</span>
                <span className="text-sm opacity-70">{l.variant.color}{l.product.sizes.length > 1 && ` · ${l.variant.size}`} · {l.qty} un.</span>
              </span>
              <span className="tabular-nums">{formatCLP(l.total)}</span>
            </li>
          ))}
        </ul>

        {code ? (
          <p className="flex items-center justify-between gap-3 text-base">
            <span>Código <strong>{code.code}</strong></span>
            <button type="button" className="underline" onClick={() => { setCode(null); setCodeInput(""); }}>Quitar</button>
          </p>
        ) : (
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="co-code">Código de descuento</label>
            <input id="co-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Código de descuento" className="h-11 min-w-0 flex-1 rounded-brand bg-bg px-3 text-base text-ink" />
            <button type="button" disabled={pending || !codeInput.trim()} onClick={() => applyCode(codeInput)} className="h-11 rounded-brand bg-ink px-4 text-base text-bg disabled:opacity-50">Aplicar</button>
          </div>
        )}
        {(codeMsg || shortBy > 0) && <p className="-mt-2 text-base" aria-live="polite">{codeMsg ?? `${code?.code} pide una compra mínima de ${formatCLP(code!.minSubtotal)}. Te faltan ${formatCLP(shortBy)}.`}</p>}

        <dl className="flex flex-col gap-2 text-lg">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCLP(cart.subtotal)}</dd></div>
          {t.discountTotal > 0 && <div className="flex justify-between"><dt>{t.active?.code} (−{t.active?.percent}%)</dt><dd className="tabular-nums">−{formatCLP(t.discountTotal)}</dd></div>}
          <div className="flex justify-between">
            <dt>Envío {d.region ? (d.region === "Metropolitana" ? "RM" : "a regiones") : ""}</dt>
            <dd className="tabular-nums">{!d.region ? "Elige la región" : t.shippingTotal === 0 ? (t.freeByCode && t.baseShipping > 0 ? <><s className="mr-2 opacity-60">{formatCLP(t.baseShipping)}</s>Gratis</> : "Gratis") : formatCLP(t.shippingTotal)}</dd>
          </div>
          <div className="mt-2 flex justify-between text-2xl"><dt>Total</dt><dd className="tabular-nums">{formatCLP(t.total)}</dd></div>
        </dl>

        {error && <p role="alert" className="rounded-brand bg-bg p-3 text-base text-ink">{error}</p>}
        <button disabled={pending || leaving || !method} className="h-14 rounded-brand bg-bg px-6 text-lg text-ink transition-transform active:scale-[0.98] disabled:opacity-60">
          {pending || leaving ? (method === "transfer" ? "Creando tu pedido…" : "Te llevamos a pagar…") : method === "transfer" ? `Confirmar pedido por ${formatCLP(t.total)}` : `Pagar ${formatCLP(t.total)}`}
        </button>
        <p className="text-sm opacity-80">Al pagar aceptas los términos de la tienda. Tus datos de pago los ingresas en el sitio de la pasarela, nunca aquí.</p>
      </aside>
    </form>
    {/* Formulario que envía el token a Webpay. */}
    <form ref={gateway} method="POST" className="hidden" aria-hidden />
    </>
  );
}
