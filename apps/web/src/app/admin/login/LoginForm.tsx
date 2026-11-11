"use client";

import { useActionState, useState } from "react";
import { login } from "@/lib/admin/actions";

const input = "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base font-normal";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  // Controlados: si la cuenta pide el código, el correo y la contraseña siguen ahí para
  // el segundo envío (React vacía los campos no controlados después de cada acción).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [backup, setBackup] = useState(false);
  const step2 = Boolean(state.needsCode);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={`flex flex-col gap-1.5 text-sm font-medium ${step2 ? "hidden" : ""}`}>
        Correo
        <input name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label className={`flex flex-col gap-1.5 text-sm font-medium ${step2 ? "hidden" : ""}`}>
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      {step2 && (
        <>
          <p className="text-sm text-zinc-600">
            {backup ? "Escribe uno de tus códigos de respaldo. Cada uno sirve una sola vez." : `Abre tu app de verificación y escribe el código de 6 números para ${email}.`}
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {backup ? "Código de respaldo" : "Código"}
            <input
              key={backup ? "backup" : "totp"}
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode={backup ? "text" : "numeric"}
              pattern={backup ? undefined : "\\s*\\d{3}\\s*\\d{3}\\s*"}
              maxLength={backup ? 40 : 7}
              className={`${input} tracking-widest`}
            />
          </label>
          <button type="button" onClick={() => setBackup((b) => !b)} className="self-start text-sm text-zinc-600 underline underline-offset-4">
            {backup ? "Usar el código de la app" : "No tengo el teléfono: usar un código de respaldo"}
          </button>
        </>
      )}
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="h-11 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-60">
        {pending ? "Entrando…" : step2 ? "Verificar" : "Entrar"}
      </button>
    </form>
  );
}
