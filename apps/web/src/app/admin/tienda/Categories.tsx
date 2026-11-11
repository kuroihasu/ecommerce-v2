"use client";

import { useActionState } from "react";
import { createCategory } from "@/lib/admin/actions";
import type { AdminCategory } from "@/lib/admin/types";

export function Categories({ categories }: { categories: AdminCategory[] }) {
  const [state, action, pending] = useActionState(createCategory, {});
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold">Categorías</h2>
      <p className="mb-4 text-sm text-zinc-500">En la tienda solo aparecen las que tienen productos publicados.</p>
      <ul className="mb-4 divide-y divide-zinc-100">
        {categories.map((c) => (
          <li key={c.id} className="flex justify-between py-2">
            <span>{c.name}</span>
            <span className="text-sm text-zinc-500">{c._count.products} productos</span>
          </li>
        ))}
      </ul>
      <form action={action} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Nueva categoría" aria-label="Nueva categoría" required className="h-10 rounded-lg border border-zinc-300 px-3" />
        <button disabled={pending} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-100 disabled:opacity-60">{pending ? "Agregando…" : "Agregar"}</button>
        {state.error && <p role="alert" className="w-full text-sm text-red-700">{state.error}</p>}
      </form>
    </section>
  );
}
