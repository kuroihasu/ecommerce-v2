import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/lib/admin/actions";

const links = [
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/diseno", label: "Diseño y colores" },
  { href: "/admin/tienda", label: "Datos de la tienda" },
];

// Marco de las páginas del panel: menú lateral y contenido.
export function AdminShell({ current, children }: { current: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 md:flex-row md:px-8 md:py-10">
      <aside className="flex shrink-0 flex-col gap-6 md:w-56">
        <Link href="/admin/productos" className="text-xl font-semibold">Panel</Link>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-[15px] ${current === l.href ? "bg-zinc-900 text-white" : "hover:bg-zinc-200"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-3 text-sm text-zinc-600 md:flex-col md:gap-2">
          <Link href="/" target="_blank" className="hover:text-zinc-900">Ver la tienda ↗</Link>
          <form action={logout}>
            <button className="hover:text-zinc-900">Salir</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
