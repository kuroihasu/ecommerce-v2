"use client";

import { useEffect, useState } from "react";

// Barra de anuncios que rota sus mensajes cada 4 s.
export function AnnouncementRotator({ items, className = "" }: { items: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((k) => (k + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className={`relative h-10 overflow-hidden text-center text-base ${className}`} aria-live="polite">
      {items.map((t, k) => (
        <p
          key={t}
          className={`absolute inset-0 flex items-center justify-center px-4 transition-all duration-500 ${
            k === i ? "translate-y-0 opacity-100" : k === (i - 1 + items.length) % items.length ? "-translate-y-full opacity-0" : "translate-y-full opacity-0"
          }`}
        >
          {t}
        </p>
      ))}
    </div>
  );
}

// Suscripción con descuento de bienvenida (en la preview no envía nada).
export function Newsletter({ className = "", inputClass = "", buttonClass = "", label = "Suscribirme" }: {
  className?: string;
  inputClass?: string;
  buttonClass?: string;
  label?: string;
}) {
  const [sent, setSent] = useState(false);
  if (sent) return <p className={`text-xl ${className}`}>Listo. Revisa tu correo: ahí va tu código de 10%.</p>;
  return (
    <form
      className={`flex flex-col gap-3 sm:flex-row ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <label htmlFor="nl-email" className="sr-only">Tu correo</label>
      <input id="nl-email" type="email" required placeholder="tu@correo.cl" className={`h-14 min-w-0 flex-1 px-5 text-lg ${inputClass}`} />
      <button className={`h-14 px-8 text-lg transition-transform active:scale-[0.98] ${buttonClass}`}>{label}</button>
    </form>
  );
}

// Cuenta regresiva al próximo lanzamiento.
export function Countdown({ date, className = "", cellClass = "" }: { date: string; className?: string; cellClass?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const diff = Math.max(0, new Date(date).getTime() - (now ?? new Date(date).getTime()));
  const parts: [number, string][] = [
    [Math.floor(diff / 86400000), "días"],
    [Math.floor(diff / 3600000) % 24, "horas"],
    [Math.floor(diff / 60000) % 60, "min"],
    [Math.floor(diff / 1000) % 60, "seg"],
  ];
  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`} role="timer" aria-label="Tiempo para el lanzamiento">
      {parts.map(([n, l]) => (
        <div key={l} className={`flex flex-col items-center justify-center py-4 ${cellClass}`}>
          <span className="tabular-nums">{now === null ? "--" : String(n).padStart(2, "0")}</span>
          <span className="text-base font-semibold tracking-normal">{l}</span>
        </div>
      ))}
    </div>
  );
}
