"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { verifyStepUp } from "@/lib/admin/actions";
import type { StepUp } from "@/lib/admin/types";

// Cambios críticos (pagos, marcar pagado, descuentos, cuentas de publicidad): si la API
// responde que falta el código de 2FA, se abre esta ventana, se valida el código y se
// reintenta la acción. Después de validar hay 5 minutos sin volver a pedirlo.
type Result = { ok: boolean; stepUp?: StepUp };
type Ask = { kind: StepUp; resolve: (code: string | null) => void };

const Ctx = createContext<<T extends Result>(fn: () => Promise<T>) => Promise<T>>((fn) => fn());

export const useTwoFactor = () => useContext(Ctx);

export function StepUpProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const askRef = useRef<Ask | null>(null);

  const open = (kind: StepUp) =>
    new Promise<string | null>((resolve) => {
      const a = { kind, resolve };
      askRef.current = a;
      setCode("");
      setError(null);
      setAsk(a);
    });

  const close = (value: string | null) => {
    askRef.current?.resolve(value);
    askRef.current = null;
    setAsk(null);
  };

  const withTwoFactor = useCallback(async <T extends Result>(fn: () => Promise<T>): Promise<T> => {
    const first = await fn();
    if (first.ok || !first.stepUp) return first;
    if (first.stepUp === "setup") {
      await open("setup");
      return first;
    }
    const ok = await open("code");
    return ok ? fn() : first;
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await verifyStepUp(code);
    setBusy(false);
    if (r.ok) close("ok");
    else setError(r.error);
  };

  return (
    <Ctx.Provider value={withTwoFactor}>
      {children}
      {ask && (
        <div role="dialog" aria-modal="true" aria-labelledby="stepup-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && !busy && close(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="stepup-title" className="text-lg font-semibold">{ask.kind === "setup" ? "Activa la verificación en dos pasos" : "Confirma con tu código"}</h2>
            {ask.kind === "setup" ? (
              <>
                <p className="mt-2 text-[15px] text-zinc-600">Este cambio es delicado (pagos, pedidos o descuentos). Para hacerlo, primero activa la verificación en dos pasos en tu cuenta.</p>
                <div className="mt-5 flex gap-3">
                  <Link href="/admin/seguridad" onClick={() => close(null)} className="flex h-11 items-center rounded-lg bg-zinc-900 px-5 font-medium text-white">Ir a Seguridad</Link>
                  <button type="button" onClick={() => close(null)} className="h-11 px-3 text-sm text-zinc-600 underline">Ahora no</button>
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                <p className="mt-2 text-[15px] text-zinc-600">Es un cambio delicado. Escribe el código de 6 números de tu app (o un código de respaldo). No te lo volveremos a pedir por 5 minutos.</p>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={40}
                  aria-label="Código de verificación"
                  className="mt-4 h-11 w-full rounded-lg border border-zinc-300 px-3 text-lg tracking-widest"
                />
                {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex gap-3">
                  <button disabled={busy || !code.trim()} className="h-11 rounded-lg bg-zinc-900 px-5 font-medium text-white disabled:opacity-60">{busy ? "Revisando…" : "Confirmar"}</button>
                  <button type="button" disabled={busy} onClick={() => close(null)} className="h-11 px-3 text-sm text-zinc-600 underline">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
