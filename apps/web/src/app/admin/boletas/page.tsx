import { adminApi } from "@/lib/admin/api";
import type { BillingConfig, ReceiptList } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { BillingForm } from "./BillingForm";
import { Receipts } from "./Receipts";

export default async function ReceiptsPage() {
  const [config, list] = await Promise.all([adminApi<BillingConfig>("/receipts/config"), adminApi<ReceiptList>("/receipts")]);
  return (
    <AdminShell current="/admin/boletas">
      <h1 className="mb-1 text-2xl font-semibold">Boletas electrónicas</h1>
      <p className="mb-6 max-w-2xl text-zinc-600">
        Cada pedido pagado genera su boleta electrónica para el SII, sola. El cliente la descarga desde la página de su pedido y aparece en Contabilidad.
      </p>
      <BillingForm initial={config} />
      <Receipts initial={list} />
    </AdminShell>
  );
}
