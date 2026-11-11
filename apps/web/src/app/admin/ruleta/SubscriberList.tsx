"use client";

import type { Subscriber } from "@/lib/admin/types";

const SOURCES: Record<string, string> = { ruleta: "Ruleta", pie: "Pie de página" };
const when = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
// Comillas cuando hace falta, y un apóstrofo delante de =, +, - o @ para que Excel no
// lo tome como fórmula.
const cell = (raw: string) => {
  const v = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

// Correos de quienes se suscribieron (ruleta o pie de página), con descarga en CSV
// para cargarlos en Mailchimp, Brevo u otra herramienta de correos.
export function SubscriberList({ total, items, storeName }: { total: number; items: Subscriber[]; storeName: string }) {
  const download = () => {
    const rows = [["correo", "origen", "premio", "fecha"], ...items.map((s) => [s.email, SOURCES[s.source] ?? s.source, s.prize ?? "", s.createdAt])];
    const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `suscriptores-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Suscriptores</h2>
          <p className="text-sm text-zinc-500">{total === 1 ? "1 correo" : `${total} correos`} para enviar novedades.</p>
        </div>
        {items.length > 0 && <button type="button" onClick={download} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Descargar CSV</button>}
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Todavía nadie se suscribe. Los correos de la ruleta y del formulario del pie de página aparecerán aquí.</p>
      ) : (
        <div className="mt-4 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="py-2 pr-3 font-medium">Correo</th><th className="py-2 pr-3 font-medium">Origen</th><th className="py-2 pr-3 font-medium">Premio</th><th className="py-2 font-medium">Fecha</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((s) => (
                <tr key={s.email}>
                  <td className="py-2.5 pr-3">{s.email}</td>
                  <td className="py-2.5 pr-3">{SOURCES[s.source] ?? s.source}</td>
                  <td className="py-2.5 pr-3 font-mono">{s.prize ?? <span className="font-sans text-zinc-400">—</span>}</td>
                  <td className="py-2.5 text-zinc-600">{when(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > items.length && <p className="mt-2 text-xs text-zinc-500">Se muestran los {items.length} más recientes.</p>}
    </section>
  );
}
