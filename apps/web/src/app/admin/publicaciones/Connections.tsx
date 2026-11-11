"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectIntegration, disconnectIntegration } from "@/lib/admin/actions";
import type { IntegrationStatus } from "@/lib/admin/types";
import { useTwoFactor } from "../StepUp";

const about: Record<string, string> = {
  meta: "Publicaciones y seguidores de Instagram, y resultados de tus anuncios en Facebook e Instagram.",
  google: "Inversión, clics y conversiones de tus campañas de Google Ads.",
};

// `failing`: cuentas conectadas cuya consulta falló (por ejemplo, el permiso se revocó en Meta).
export function Connections({ status, failing = [] }: { status: IntegrationStatus[]; failing?: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const withTwoFactor = useTwoFactor();

  const connect = (p: string) => {
    setBusy(p);
    setError(null);
    start(async () => {
      // Si todo va bien, la acción redirige a Meta/Google y no vuelve aquí.
      const res = await withTwoFactor(async () => ({ ok: false, ...(await connectIntegration(p)) }));
      if (res?.error) setError(res.error);
      setBusy(null);
    });
  };

  const disconnect = (p: string, name: string) => {
    if (!confirm(`¿Desconectar ${name}? Dejarás de ver sus datos en el panel. Tus anuncios y publicaciones no cambian.`)) return;
    setBusy(p);
    start(async () => {
      const res = await withTwoFactor(() => disconnectIntegration(p));
      if (!res.ok) setError(res.error);
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Cuentas conectadas</h2>
      <p className="mt-1 text-sm text-zinc-500">Solo lectura: el panel nunca publica ni cambia tus anuncios. Puedes desconectar cuando quieras.</p>
      <ul className="mt-4 divide-y divide-zinc-100">
        {status.map((s) => ({ ...s, expired: s.expired || failing.includes(s.provider) })).map((s) => (
          <li key={s.provider} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-zinc-500">
                {s.connected ? (s.expired ? "La conexión venció: vuelve a conectar." : `Conectado: ${s.accountName}`) : about[s.provider]}
              </p>
              {!s.available && <p className="mt-1 text-xs text-amber-700">Falta configurar la app de {s.provider === "meta" ? "Meta" : "Google"} en el servidor (ver README).</p>}
            </div>
            <div className="flex gap-2">
              {s.connected && (
                <button onClick={() => disconnect(s.provider, s.name)} disabled={busy !== null} className="h-9 rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-100 disabled:opacity-60">
                  Desconectar
                </button>
              )}
              {(!s.connected || s.expired) && (
                <button onClick={() => connect(s.provider)} disabled={!s.available || busy !== null} className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50">
                  {busy === s.provider ? "Abriendo…" : s.expired ? "Volver a conectar" : "Conectar"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
