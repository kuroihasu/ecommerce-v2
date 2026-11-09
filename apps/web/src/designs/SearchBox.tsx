"use client";

import { useEffect, useRef } from "react";

// Campo de búsqueda del catálogo. Los enlaces "Buscar" del menú apuntan a
// /catalogo#buscar y el campo toma el foco al llegar.
export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar prendas, colores…",
  className = "",
  inputClass = "",
}: {
  value: string;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
  inputClass?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focus = () => window.location.hash === "#buscar" && ref.current?.focus();
    focus();
    window.addEventListener("hashchange", focus);
    return () => window.removeEventListener("hashchange", focus);
  }, []);

  return (
    <form role="search" className={`relative ${className}`} onSubmit={(e) => e.preventDefault()}>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        id="buscar"
        type="search"
        aria-label="Buscar en el catálogo"
        placeholder={placeholder}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value || null)}
        autoComplete="off"
        enterKeyHint="search"
        className={`h-12 w-full pr-4 pl-12 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent ${inputClass}`}
      />
    </form>
  );
}
