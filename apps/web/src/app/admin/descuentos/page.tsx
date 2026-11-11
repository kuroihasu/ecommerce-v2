import { adminApi } from "@/lib/admin/api";
import type { AdminDiscount } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { DiscountManager } from "./DiscountManager";

export default async function DiscountsPage() {
  const codes = await adminApi<AdminDiscount[]>("/discounts");
  return (
    <AdminShell current="/admin/descuentos">
      <h1 className="mb-1 text-2xl font-semibold">Descuentos</h1>
      <p className="mb-6 text-zinc-600">
        Crea los códigos que tus clientes escriben en el carrito. Cada uno tiene su porcentaje, cuántas veces se puede usar y, si quieres, una fecha de término.
      </p>
      <DiscountManager initial={codes} />
    </AdminShell>
  );
}
