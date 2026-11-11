"use client";

import { useState, useTransition } from "react";
import { confirmTwoFactor, disableTwoFactor, newRecoveryCodes, startTwoFactor, type TwoFactorStatus } from "@/lib/admin/actions";

const input = "h-11 w-40 rounded-lg border border-zinc-300 bg-white px-3 text-base tracking-widest";
const primary = "h-11 rounded-lg bg-zinc-900 px-5 font-medium text-white disabled:opacity-60";
const secondary = "h-11 rounded-lg border border-zinc-300 px-5 font-medium hover:bg-zinc-100 disabled:opacity-60";

type Step = { kind: "idle" } | { kind: "scan"; secret: string; qr: string } | { kind: "codes"; codes: string[] } | { kind: "disable" } | { kind: "regen" };

export function TwoFactor({ initial }: { initial: TwoFactorStatus }) {
  const [status, setStatus] = useState(initial);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = <T,>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, then: (d: T) => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        setCode("");
        then(r.data);
      } else setError(r.error);
    });

  const codeField = (label: string, numeric = true) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="one-time-code" inputMode={numeric ? "numeric" : "text"} maxLength={40} className={input} />
    </label>
  );

  return (
    <section className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Verificación en dos pasos</h2>
        <span className={`rounded-full px-3 py-1 text-sm ${status.enabled ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700"}`}>{status.enabled ? "Activada" : "Apagada"}</span>
      </div>
      <p className="mb-5 text-zinc-600">
        Además de la contraseña, al entrar se pide un código de 6 números que cambia cada 30 segundos en tu teléfono. Si alguien roba tu contraseña, igual no puede entrar ni tocar tus pagos.
      </p>

      {step.kind === "idle" && !status.enabled && (
        <button disabled={pending} onClick={() => run(startTwoFactor, (d) => setStep({ kind: "scan", ...d }))} className={primary}>
          {pending ? "Preparando…" : "Activar"}
        </button>
      )}

      {step.kind === "scan" && (
        <div className="flex flex-col gap-5">
          <ol className="list-decimal space-y-1 pl-5 text-[15px]">
            <li>Instala Google Authenticator, Microsoft Authenticator o 1Password en tu teléfono.</li>
            <li>En la app, toca «Agregar» y escanea este código.</li>
            <li>Escribe el número de 6 dígitos que aparece.</li>
          </ol>
          {/* QR generado en nuestro servidor (data: URL): el secreto no pasa por servicios externos. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.qr} alt="Código QR para tu app de verificación" width={208} height={208} className="rounded-lg border border-zinc-200 p-2" />
          <details className="text-sm text-zinc-600">
            <summary className="cursor-pointer">¿No puedes escanear? Escribe esta clave en la app</summary>
            <code className="mt-2 block break-all rounded bg-zinc-100 px-3 py-2 font-mono text-zinc-900">{step.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
          </details>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => confirmTwoFactor(code), (d) => { setStatus({ enabled: true, recoveryCodesLeft: d.recoveryCodes.length }); setStep({ kind: "codes", codes: d.recoveryCodes }); }); }}>
            {codeField("Código de la app")}
            <button disabled={pending || !code.trim()} className={primary}>{pending ? "Revisando…" : "Confirmar"}</button>
            <button type="button" onClick={() => { setStep({ kind: "idle" }); setError(null); }} className="h-11 px-2 text-sm text-zinc-600 underline">Cancelar</button>
          </form>
        </div>
      )}

      {step.kind === "codes" && (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-[15px] text-amber-900">
            <strong>Guarda estos códigos de respaldo</strong> (impresos o en un gestor de contraseñas). Si pierdes el teléfono, cada uno te deja entrar una vez. No se vuelven a mostrar.
          </p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-base">
            {step.codes.map((c) => <li key={c} className="rounded bg-zinc-100 px-3 py-2">{c}</li>)}
          </ul>
          <div className="flex gap-3">
            <button onClick={() => navigator.clipboard?.writeText(step.codes.join("\n"))} className={secondary}>Copiar</button>
            <button onClick={() => setStep({ kind: "idle" })} className={primary}>Ya los guardé</button>
          </div>
        </div>
      )}

      {step.kind === "idle" && status.enabled && (
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">Te quedan <strong>{status.recoveryCodesLeft}</strong> códigos de respaldo.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setStep({ kind: "regen" })} className={secondary}>Generar códigos de respaldo nuevos</button>
            <button onClick={() => setStep({ kind: "disable" })} className="h-11 rounded-lg px-3 font-medium text-red-700 hover:bg-red-50">Desactivar</button>
          </div>
        </div>
      )}

      {step.kind === "regen" && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => newRecoveryCodes(code), (d) => { setStatus({ enabled: true, recoveryCodesLeft: d.recoveryCodes.length }); setStep({ kind: "codes", codes: d.recoveryCodes }); }); }}>
          <p className="w-full text-[15px] text-zinc-600">Los códigos anteriores dejan de servir. Confirma con el código de tu app.</p>
          {codeField("Código de la app")}
          <button disabled={pending || !code.trim()} className={primary}>Generar</button>
          <button type="button" onClick={() => { setStep({ kind: "idle" }); setError(null); }} className="h-11 px-2 text-sm text-zinc-600 underline">Cancelar</button>
        </form>
      )}

      {step.kind === "disable" && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => disableTwoFactor(code), (d) => { setStatus(d); setStep({ kind: "idle" }); }); }}>
          <p className="w-full text-[15px] text-zinc-600">Tu cuenta quedará protegida solo con la contraseña. Confirma con el código de tu app o un código de respaldo.</p>
          {codeField("Código", false)}
          <button disabled={pending || !code.trim()} className="h-11 rounded-lg bg-red-700 px-5 font-medium text-white disabled:opacity-60">Desactivar</button>
          <button type="button" onClick={() => { setStep({ kind: "idle" }); setError(null); }} className="h-11 px-2 text-sm text-zinc-600 underline">Cancelar</button>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
