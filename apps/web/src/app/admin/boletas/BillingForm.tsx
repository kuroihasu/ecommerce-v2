"use client";

import { useState, useTransition } from "react";
import { saveBilling } from "@/lib/admin/actions";
import type { BillingConfig, Issuer } from "@/lib/admin/types";
import { ConfigDialog } from "../ConfigDialog";
import { useTwoFactor } from "../StepUp";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal";
type Msg = { ok: boolean; text: string } | null;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 font-medium">
      <span>{label} {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}</span>
      {children}
    </label>
  );
}

// Configuración de la emisión de boletas: proveedor (OpenFactura), modo, API key y datos
// del emisor que salen impresos en cada boleta.
export function BillingForm({ initial }: { initial: BillingConfig }) {
  const [cfg, setCfg] = useState(initial);
  const [live, setLive] = useState(initial.live);
  const [exempt, setExempt] = useState(initial.exempt);
  const [apiKey, setApiKey] = useState("");
  const [issuer, setIssuer] = useState<Issuer>(initial.issuer);
  const [msg, setMsg] = useState<Msg>(null);
  const [rowMsg, setRowMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const withTwoFactor = useTwoFactor();

  const send = (enabled: boolean, after: (ok: boolean, text: string) => void) =>
    start(async () => {
      const r = await withTwoFactor(() => saveBilling({ enabled, live, exempt, apiKey, issuer }));
      if (r.ok) {
        setCfg(r.data);
        setApiKey("");
      }
      after(r.ok, r.ok ? "Guardado." : r.error);
    });

  const set = (k: keyof Issuer) => (e: React.ChangeEvent<HTMLInputElement>) => setIssuer({ ...issuer, [k]: e.target.value });

  const status = !cfg.enabled
    ? "Apagado. Los pedidos pagados quedan sin boleta (puedes emitirlas después desde aquí)."
    : cfg.live
      ? `Emitiendo boletas${cfg.exempt ? " exentas" : ""} de verdad · ${cfg.issuer.name} (${cfg.issuer.rut})`
      : cfg.demo
        ? "Modo de prueba con la empresa de prueba de OpenFactura: las boletas no llegan al SII."
        : `Modo de prueba con tu cuenta (${cfg.issuer.rut}): las boletas no llegan al SII.`;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-medium">Emisión automática con OpenFactura</span>
          <span className="text-sm text-zinc-500">{status}</span>
        </div>
        <ConfigDialog title="Boletas electrónicas" label="Configurar boletas">
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-zinc-600">
              OpenFactura (de Haulmer) es un proveedor de facturación electrónica autorizado por el SII. Ahí subes tu certificado digital y pides tus folios; la tienda le manda cada boleta y OpenFactura la firma, la timbra y la envía al SII.
            </p>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium">Modo</legend>
              <label className="flex items-start gap-2">
                <input type="radio" name="dte-mode" checked={!live} onChange={() => setLive(false)} className="mt-0.5 h-4 w-4 accent-zinc-900" />
                <span>Prueba: usa el ambiente de prueba de OpenFactura (folios simulados, no llega al SII). Sin API key propia usa la empresa de prueba de OpenFactura.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="dte-mode" checked={live} onChange={() => setLive(true)} className="mt-0.5 h-4 w-4 accent-zinc-900" />
                <span>Emitir de verdad: boletas válidas ante el SII, con tu cuenta de OpenFactura.</span>
              </label>
            </fieldset>

            <Field label="API key de OpenFactura" hint={live ? "" : "opcional en prueba"}>
              <input className={input} type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value.trim())} placeholder={cfg.hasKey ? "Guardada · pega otra para cambiarla" : "La de tu cuenta en openfactura.cl"} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="RUT de la empresa">
                <input className={input} value={issuer.rut} onChange={set("rut")} maxLength={12} placeholder="76.123.456-7" />
              </Field>
              <Field label="Razón social">
                <input className={input} value={issuer.name} onChange={set("name")} maxLength={100} placeholder="Mi Tienda SpA" />
              </Field>
              <Field label="Giro" hint="como está en el SII">
                <input className={input} value={issuer.activity} onChange={set("activity")} maxLength={80} placeholder="Venta al por menor por internet" />
              </Field>
              <Field label="Dirección de la casa matriz o sucursal">
                <input className={input} value={issuer.address} onChange={set("address")} maxLength={70} />
              </Field>
              <Field label="Comuna">
                <input className={input} value={issuer.comuna} onChange={set("comuna")} maxLength={20} />
              </Field>
              <Field label="Código de sucursal SII" hint="opcional">
                <input className={input} value={issuer.branchCode} onChange={(e) => setIssuer({ ...issuer, branchCode: e.target.value.replace(/\D/g, "") })} maxLength={10} inputMode="numeric" />
              </Field>
            </div>

            <label className="flex items-start gap-2">
              <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} className="mt-0.5 h-4 w-4 accent-zinc-900" />
              <span>Vendo productos exentos de IVA (emitir boleta exenta, tipo 41). Si no sabes, déjalo sin marcar: lo normal es la boleta afecta (tipo 39).</span>
            </label>

            <ol className="list-decimal space-y-1 pl-5 text-zinc-600">
              <li>Crea tu cuenta en openfactura.cl con el RUT de la empresa (debe estar autorizada como emisor electrónico en el SII).</li>
              <li>Sube tu certificado digital y solicita los folios de boleta electrónica, siguiendo los pasos de OpenFactura.</li>
              <li>En tu cuenta de OpenFactura copia la API key y pégala aquí. Prueba primero en modo de prueba con un pedido.</li>
            </ol>

            <div className="sticky bottom-0 -mx-5 mt-2 flex items-center gap-4 border-t border-zinc-200 bg-white px-5 py-3">
              <button type="button" disabled={pending} onClick={() => send(cfg.enabled, (ok, text) => setMsg({ ok, text }))} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">
                {pending ? "Guardando…" : "Guardar"}
              </button>
              {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
            </div>
          </div>
        </ConfigDialog>
        <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer">
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={cfg.enabled}
            disabled={pending}
            aria-label="Activar boletas electrónicas"
            onChange={(e) => {
              const on = e.target.checked;
              setRowMsg(null);
              send(on, (ok, text) => !ok && setRowMsg({ ok, text: `${text}${on ? " Toca «Configurar» para completarlo." : ""}` }));
            }}
          />
          <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2" />
          <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </label>
      </div>
      {rowMsg && <p role="status" className="mt-2 text-sm text-red-700">{rowMsg.text}</p>}
    </section>
  );
}
