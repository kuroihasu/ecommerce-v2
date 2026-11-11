import { authApi } from "@/lib/admin/api";
import type { TwoFactorStatus } from "@/lib/admin/actions";
import { AdminShell } from "../AdminShell";
import { TwoFactor } from "./TwoFactor";

export default async function SecurityPage() {
  const status = await authApi<TwoFactorStatus>("/2fa");
  return (
    <AdminShell current="/admin/seguridad">
      <h1 className="mb-1 text-2xl font-semibold">Seguridad</h1>
      <p className="mb-6 text-zinc-600">Protege tu cuenta del panel. Cada persona del equipo activa la suya.</p>
      <TwoFactor initial={status} />
    </AdminShell>
  );
}
