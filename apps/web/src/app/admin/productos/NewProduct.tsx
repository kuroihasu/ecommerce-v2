"use client";

import { useActionState } from "react";
import { createProduct } from "@/lib/admin/actions";

// Crea un borrador con solo el nombre y lleva a la ficha para completarlo.
export function NewProduct() {
  const [state, action, pending] = useActionState(createProduct, {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input name="name" placeholder="Nombre del producto nuevo" aria-label="Nombre del producto nuevo" required className="h-10 w-64 rounded-lg border border-zinc-300 bg-white px-3" />
        <button disabled={pending} className="h-10 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-60">
          {pending ? "Creando…" : "Crear"}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
