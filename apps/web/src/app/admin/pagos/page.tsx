import { adminApi } from "@/lib/admin/api";
import type { GatewayConfig } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { PaymentsForm } from "./PaymentsForm";

export default async function PaymentsPage() {
  const config = await adminApi<GatewayConfig>("/payments");
  return (
    <AdminShell current="/admin/pagos">
      <h1 className="mb-1 text-2xl font-semibold">Pagos</h1>
      <p className="mb-6 text-zinc-600">Cómo te pagan los clientes. Activa los medios que quieras; las llaves se guardan cifradas y nunca se muestran de nuevo.</p>
      <PaymentsForm initial={config} />
    </AdminShell>
  );
}
