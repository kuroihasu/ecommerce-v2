"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { claimWheel, spinWheel } from "@/lib/wheel";
import type { PublicWheel } from "./catalog";
import { targetRotation, WheelDisc, type Slice } from "./WheelDisc";

// Ruleta de regalos: aparece una vez por visitante después de unos segundos. El
// cliente gira, ve su premio y deja su correo para recibir el código y las novedades.
// El giro lo decide el servidor; aquí solo se anima hasta la rebanada que tocó.

const PALETTE: Slice[] = [
  { fill: "var(--accent)", ink: "var(--accent-ink)" },
  { fill: "var(--field)", ink: "var(--field-ink)" },
  { fill: "var(--surface)", ink: "var(--ink)" },
  { fill: "var(--field-2)", ink: "var(--ink)" },
];
const SPIN_MS = 5200;

type Saved = { step: "result" | "done"; index: number; label: string; won: boolean; token: string; code?: string | null; percent?: number | null };
type Step = "intro" | "spinning" | "result" | "done";

const read = (key: string): Saved | "closed" | null => {
  try {
    const v = localStorage.getItem(key);
    return v === "closed" ? "closed" : v ? (JSON.parse(v) as Saved) : null;
  } catch {
    return null;
  }
};
const write = (key: string, v: Saved | "closed") => {
  try {
    localStorage.setItem(key, v === "closed" ? v : JSON.stringify(v));
  } catch {}
};

function Gift({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export function PrizeWheel({ wheel, storeName }: { wheel: PublicWheel; storeName: string }) {
  const key = `ruleta:${storeName}`;
  const [open, setOpen] = useState(false);
  const [launcher, setLauncher] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [rotation, setRotation] = useState(0);
  const [spin, setSpin] = useState<Saved | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const labels = wheel.prizes.map((p) => p.label);

  // Al cargar: si ya terminó no se muestra; si giró y no dejó el correo, vuelve al
  // resultado (no puede girar de nuevo recargando); si la cerró, queda el botón.
  useEffect(() => {
    const saved = read(key);
    if (saved && saved !== "closed") {
      const t = setTimeout(() => {
        setSpin(saved);
        setStep(saved.step);
        setRotation(targetRotation(0, saved.index, labels.length));
        if (saved.step === "result") setLauncher(true);
      }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => (saved === "closed" ? setLauncher(true) : setOpen(true)), saved === "closed" ? 0 : wheel.delaySeconds * 1000);
    return () => clearTimeout(t);
  }, [key, wheel.delaySeconds, labels.length]);

  const close = useCallback(() => {
    setOpen(false);
    if (step === "intro") write(key, "closed");
    setLauncher(step !== "done");
  }, [key, step]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step !== "spinning" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, close]);

  const go = async () => {
    setError(null);
    setBusy(true);
    const res = await spinWheel();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saved: Saved = { step: "result", index: res.index, label: res.label, won: res.won, token: res.token };
    setStep("spinning");
    setRotation((r) => targetRotation(r, res.index, labels.length));
    write(key, saved);
    setTimeout(() => {
      setSpin(saved);
      setStep("result");
    }, reduced ? 700 : SPIN_MS);
  };

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spin) return;
    setError(null);
    setBusy(true);
    const res = await claimWheel(email, spin.token);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const done: Saved = { ...spin, step: "done", code: res.code, percent: res.percent };
    setSpin(done);
    setStep("done");
    setLauncher(false);
    write(key, done);
  };

  const copy = async () => {
    if (!spin?.code) return;
    try {
      await navigator.clipboard.writeText(spin.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const r = "rounded-brand";

  return (
    <>
      {launcher && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-[55] flex h-12 items-center gap-2 rounded-full bg-accent px-5 text-base font-medium text-accent-ink shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Gift className="h-5 w-5" />
          {step === "result" ? "Ver mi premio" : "Gira y gana"}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={(e) => e.target === e.currentTarget && step !== "spinning" && close()}>
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ruleta-titulo"
            className="rise relative max-h-[100dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[calc(var(--radius)+8px)] bg-bg p-6 text-ink shadow-2xl sm:rounded-[calc(var(--radius)+8px)] sm:p-8"
          >
            {step !== "spinning" && (
              <button type="button" onClick={close} aria-label="Cerrar" className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-ink/60 hover:bg-surface hover:text-ink">
                ×
              </button>
            )}

            {(step === "intro" || step === "spinning") && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex flex-col gap-2">
                  <h2 id="ruleta-titulo" className="font-display text-3xl leading-tight">{wheel.title || "Gira y gana"}</h2>
                  {wheel.subtitle && <p className="text-base text-ink/70">{wheel.subtitle}</p>}
                </div>
                <WheelDisc labels={labels} palette={PALETTE} rotation={rotation} duration={step === "spinning" ? SPIN_MS : 0} className="w-[min(300px,72vw)] text-ink" />
                <button
                  type="button"
                  onClick={go}
                  disabled={busy || step === "spinning"}
                  className={`h-14 w-full bg-accent px-8 text-lg font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-70 ${r}`}
                >
                  {step === "spinning" ? "Girando…" : busy ? "Un momento…" : "Girar la ruleta"}
                </button>
                {error && <p role="alert" className="text-base">{error}</p>}
                {step === "intro" && (
                  <button type="button" onClick={close} className="text-sm text-ink/60 underline underline-offset-4">No, gracias</button>
                )}
              </div>
            )}

            {step === "result" && spin && (
              <form onSubmit={claim} className="flex flex-col items-center gap-5 text-center">
                <WheelDisc labels={labels} palette={PALETTE} rotation={rotation} className="w-40 text-ink" />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium uppercase tracking-wide text-ink/60">{spin.won ? "¡Ganaste!" : "¡Casi!"}</p>
                  <h2 id="ruleta-titulo" className="font-display text-4xl leading-tight">{spin.label}</h2>
                  <p className="text-base text-ink/70">
                    {spin.won
                      ? "Déjanos tu correo para ver tu código y enterarte primero de las novedades y ofertas."
                      : "Déjanos tu correo y te avisamos primero de las novedades y ofertas."}
                  </p>
                </div>
                <label htmlFor="ruleta-email" className="sr-only">Tu correo</label>
                <input
                  id="ruleta-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.cl"
                  className={`h-14 w-full bg-surface px-5 text-lg ${r}`}
                />
                <button disabled={busy} className={`h-14 w-full bg-accent px-8 text-lg font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-70 ${r}`}>
                  {busy ? "Un momento…" : spin.won ? "Ver mi código" : "Suscribirme"}
                </button>
                {error && <p role="alert" className="text-base">{error}</p>}
                <p className="text-xs text-ink/60">Al dejar tu correo aceptas recibir novedades de {storeName}. Puedes darte de baja cuando quieras.</p>
              </form>
            )}

            {step === "done" && spin && (
              <div className="flex flex-col items-center gap-5 py-2 text-center">
                <Gift className="h-12 w-12 text-accent" />
                {spin.code ? (
                  <>
                    <h2 id="ruleta-titulo" className="font-display text-3xl leading-tight">Tu código de {spin.percent}%</h2>
                    <button type="button" onClick={copy} className={`w-full border-2 border-dashed border-ink/30 bg-surface px-6 py-4 font-mono text-2xl font-bold tracking-wider ${r}`} aria-label={`Copiar el código ${spin.code}`}>
                      {spin.code}
                    </button>
                    <p className="text-base text-ink/70" aria-live="polite">{copied ? "Copiado." : "Tócalo para copiarlo y escríbelo en el carrito."}</p>
                  </>
                ) : (
                  <>
                    <h2 id="ruleta-titulo" className="font-display text-3xl leading-tight">¡Gracias por suscribirte!</h2>
                    <p className="text-base text-ink/70">Te avisaremos primero de lo nuevo y de las ofertas.</p>
                  </>
                )}
                <button type="button" onClick={close} className={`h-14 w-full bg-accent px-8 text-lg font-medium text-accent-ink ${r}`}>Seguir comprando</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
