"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveGateway } from "@/lib/admin/actions";
import type { GatewayConfig } from "@/lib/admin/types";
import { ConfigDialog } from "../ConfigDialog";
import { useTwoFactor } from "../StepUp";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal";
type Provider = keyof GatewayConfig;
type Msg = { ok: boolean; text: string } | null;

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer">
      <input type="checkbox" role="switch" className="peer sr-only" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2" />
      <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

function Row({ title, status, dialog, on, onToggle, busy }: { title: string; status: ReactNode; dialog: ReactNode; on: boolean; onToggle: (on: boolean) => void; busy: boolean }) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{title}</span>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
      {dialog}
      <Switch on={on} label={`Activar ${title}`} disabled={busy} onChange={onToggle} />
    </div>
  );
}

function SaveBar({ pending, msg, onSave }: { pending: boolean; msg: Msg; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 flex items-center gap-4 border-t border-zinc-200 bg-white px-5 py-3">
      <button type="button" onClick={onSave} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}

// Medios de pago: cada uno se enciende con su interruptor y se configura en su ventana.
export function PaymentsForm({ initial }: { initial: GatewayConfig }) {
  const [cfg, setCfg] = useState(initial);
  const [rowMsg, setRowMsg] = useState<Msg>(null);
  const [busy, startRow] = useTransition();

  // Webpay
  const [wp, setWp] = useState({ live: initial.webpay.live, commerceCode: initial.webpay.commerceCode, apiKey: "" });
  // Mercado Pago
  const [mpToken, setMpToken] = useState("");
  // Transferencia
  const [tr, setTr] = useState(() => {
    const { bank, accountType, accountNumber, holder, rut, email } = initial.transfer;
    return { bank, accountType, accountNumber, holder, rut, email };
  });
  const [msg, setMsg] = useState<Record<Provider, Msg>>({ webpay: null, mercadopago: null, transfer: null });
  const [pending, start] = useTransition();
  const withTwoFactor = useTwoFactor();

  const body = (p: Provider, enabled: boolean) =>
    p === "webpay" ? { enabled, ...wp } : p === "mercadopago" ? { enabled, accessToken: mpToken } : { enabled, ...tr };

  const toggle = (p: Provider, on: boolean) =>
    startRow(async () => {
      setRowMsg(null);
      const r = await withTwoFactor(() => saveGateway(p, body(p, on)));
      if (r.ok) setCfg(r.data);
      else setRowMsg({ ok: false, text: `${r.error}${on ? " Toca «Configurar» para completarlo." : ""}` });
    });

  const save = (p: Provider) =>
    start(async () => {
      const r = await withTwoFactor(() => saveGateway(p, body(p, cfg[p].enabled)));
      if (r.ok) {
        setCfg(r.data);
        setWp((w) => ({ ...w, apiKey: "" }));
        setMpToken("");
      }
      setMsg((m) => ({ ...m, [p]: r.ok ? { ok: true, text: "Guardado." } : { ok: false, text: r.error } }));
    });

  const w = cfg.webpay;
  const m = cfg.mercadopago;
  const t = cfg.transfer;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="divide-y divide-zinc-100">
        <Row
          title="Webpay Plus (Transbank)"
          on={w.enabled}
          busy={busy}
          onToggle={(on) => toggle("webpay", on)}
          status={!w.enabled ? "Apagado. Tarjetas de crédito, débito y prepago." : w.live ? `Cobrando de verdad · comercio ${w.commerceCode}` : "Modo de prueba: usa el comercio de prueba de Transbank y no cobra."}
          dialog={
            <ConfigDialog title="Webpay Plus" label="Configurar Webpay">
              <div className="flex flex-col gap-4 text-sm">
                <p className="text-zinc-600">El cliente paga con tarjeta en el sitio de Transbank y vuelve a tu tienda con el pedido pagado.</p>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-medium">Modo</legend>
                  <label className="flex items-start gap-2">
                    <input type="radio" name="wp-mode" checked={!wp.live} onChange={() => setWp({ ...wp, live: false })} className="mt-0.5 h-4 w-4 accent-zinc-900" />
                    <span>Prueba: sin cobros reales, con el comercio de prueba de Transbank. Ideal para revisar la tienda.</span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="radio" name="wp-mode" checked={wp.live} onChange={() => setWp({ ...wp, live: true })} className="mt-0.5 h-4 w-4 accent-zinc-900" />
                    <span>Cobrar de verdad, con tu código de comercio.</span>
                  </label>
                </fieldset>
                {wp.live ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 font-medium">
                      Código de comercio
                      <input className={input} value={wp.commerceCode} onChange={(e) => setWp({ ...wp, commerceCode: e.target.value.replace(/\D/g, "") })} inputMode="numeric" maxLength={12} placeholder="5970XXXXXXXX" />
                    </label>
                    <label className="flex flex-col gap-1.5 font-medium">
                      Llave secreta (API Key Secret)
                      <input className={input} type="password" autoComplete="off" value={wp.apiKey} onChange={(e) => setWp({ ...wp, apiKey: e.target.value.trim() })} placeholder={w.hasKey ? "Guardada · escribe otra para cambiarla" : "La que te entregó Transbank"} />
                    </label>
                    <p className="text-zinc-500 sm:col-span-2">
                      El código de comercio llega al contratar Webpay Plus en transbank.cl. La llave secreta te la envía Transbank después de validar tu integración (ellos piden probar unas compras en modo de prueba primero).
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-zinc-50 p-3 text-zinc-600">
                    <p className="font-medium text-zinc-800">Tarjetas de prueba de Transbank</p>
                    <p>Crédito VISA 4051 8856 0044 6623, CVV 123, cualquier fecha futura. En la pantalla del banco: RUT 11.111.111-1, clave 123. Para probar un rechazo usa la Mastercard 5186 0595 5959 0568.</p>
                  </div>
                )}
                <SaveBar pending={pending} msg={msg.webpay} onSave={() => save("webpay")} />
              </div>
            </ConfigDialog>
          }
        />
        <Row
          title="Mercado Pago"
          on={m.enabled}
          busy={busy}
          onToggle={(on) => toggle("mercadopago", on)}
          status={!m.enabled ? "Apagado. Tarjetas, saldo de Mercado Pago y cuotas." : m.test ? "Modo de prueba (token TEST-)." : "Cobrando con tu cuenta de Mercado Pago."}
          dialog={
            <ConfigDialog title="Mercado Pago" label="Configurar Mercado Pago">
              <div className="flex flex-col gap-4 text-sm">
                <p className="text-zinc-600">El cliente paga en el sitio de Mercado Pago (tarjetas, saldo o cuotas) y vuelve a tu tienda. Mercado Pago también avisa solo cuando un pago se aprueba.</p>
                <label className="flex flex-col gap-1.5 font-medium">
                  Access token
                  <input className={input} type="password" autoComplete="off" value={mpToken} onChange={(e) => setMpToken(e.target.value.trim())} placeholder={m.hasToken ? "Guardado · pega otro para cambiarlo" : "APP_USR-…"} />
                </label>
                <ol className="list-decimal space-y-1 pl-5 text-zinc-600">
                  <li>Entra a mercadopago.cl/developers con tu cuenta y abre «Tus integraciones».</li>
                  <li>Crea una aplicación (tipo «Pagos online», producto «Checkout Pro»).</li>
                  <li>En «Credenciales de producción» copia el Access token (empieza con APP_USR-) y pégalo aquí.</li>
                </ol>
                <p className="text-zinc-500">Para probar sin cobrar, usa las credenciales de prueba de una cuenta de prueba de Mercado Pago.</p>
                <SaveBar pending={pending} msg={msg.mercadopago} onSave={() => save("mercadopago")} />
              </div>
            </ConfigDialog>
          }
        />
        <Row
          title="Transferencia bancaria"
          on={t.enabled}
          busy={busy}
          onToggle={(on) => toggle("transfer", on)}
          status={!t.enabled ? "Apagado. El cliente transfiere y tú confirmas el pago en Pedidos." : `${t.bank} · ${t.accountType} ${t.accountNumber}`}
          dialog={
            <ConfigDialog title="Transferencia bancaria" label="Configurar transferencia">
              <div className="flex flex-col gap-4 text-sm">
                <p className="text-zinc-600">Al confirmar el pedido, el cliente ve estos datos. Cuando veas el depósito, márcalo como pagado en Pedidos.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 font-medium">
                    Banco
                    <input className={input} value={tr.bank} onChange={(e) => setTr({ ...tr, bank: e.target.value })} maxLength={60} placeholder="Banco de Chile" />
                  </label>
                  <label className="flex flex-col gap-1.5 font-medium">
                    Tipo de cuenta
                    <select className={input} value={tr.accountType} onChange={(e) => setTr({ ...tr, accountType: e.target.value })}>
                      <option value="">Elige</option>
                      {["Cuenta corriente", "Cuenta vista", "Cuenta RUT", "Cuenta de ahorro"].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 font-medium">
                    Número de cuenta
                    <input className={input} value={tr.accountNumber} onChange={(e) => setTr({ ...tr, accountNumber: e.target.value })} maxLength={30} inputMode="numeric" />
                  </label>
                  <label className="flex flex-col gap-1.5 font-medium">
                    Titular
                    <input className={input} value={tr.holder} onChange={(e) => setTr({ ...tr, holder: e.target.value })} maxLength={100} />
                  </label>
                  <label className="flex flex-col gap-1.5 font-medium">
                    RUT del titular
                    <input className={input} value={tr.rut} onChange={(e) => setTr({ ...tr, rut: e.target.value })} maxLength={12} placeholder="76.123.456-7" />
                  </label>
                  <label className="flex flex-col gap-1.5 font-medium">
                    Correo para el comprobante <span className="text-xs font-normal text-zinc-500">opcional</span>
                    <input className={input} type="email" value={tr.email} onChange={(e) => setTr({ ...tr, email: e.target.value })} maxLength={254} />
                  </label>
                </div>
                <SaveBar pending={pending} msg={msg.transfer} onSave={() => save("transfer")} />
              </div>
            </ConfigDialog>
          }
        />
      </div>
      {rowMsg && <p role="status" className="mt-2 text-sm text-red-700">{rowMsg.text}</p>}
      <p className="mt-4 text-sm text-zinc-500">
        Si ningún medio está activo, el checkout le pide al cliente que te escriba. Los pagos de prueba aparecen en Pedidos igual que los reales.
      </p>
    </section>
  );
}
