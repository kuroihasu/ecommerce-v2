"use client";

import { useActionState } from "react";
import { login } from "@/lib/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Correo
        <input name="email" type="email" autoComplete="username" required defaultValue={state.email} key={state.email} className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required autoFocus={!!state.email} className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base font-normal" />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="h-11 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
