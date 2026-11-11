import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Panel · Tienda", robots: { index: false } };

// El panel no usa el diseño de la tienda: tiene su propio estilo neutro.
// Lo que lee la sesión va dentro de Suspense (con Cache Components, leer cookies
// fuera de un Suspense no compila).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-zinc-50 font-[family-name:var(--font-geist-sans)] text-zinc-900">
      <Suspense fallback={<p className="p-10 text-zinc-500">Cargando…</p>}>{children}</Suspense>
    </div>
  );
}
