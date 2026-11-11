"use client";

import { useRef, type ReactNode } from "react";

// Botón "Configurar" que abre los ajustes de una parte de la tienda en una ventana.
// En el celular la ventana ocupa toda la pantalla; en el computador queda centrada.
// Usa <dialog> nativo: Escape cierra y el foco vuelve solo al botón.
export function ConfigDialog({ title, label, children }: { title: string; label?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="h-9 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50"
        aria-label={label ?? `Configurar ${title}`}
      >
        Configurar
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 text-zinc-900 backdrop:bg-black/40 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:w-[min(960px,calc(100vw-3rem))] sm:rounded-2xl"
      >
        <div className="flex h-full max-h-[inherit] flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={() => ref.current?.close()} className="grid h-10 w-10 place-items-center rounded-full text-2xl leading-none text-zinc-600 hover:bg-zinc-100" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}
