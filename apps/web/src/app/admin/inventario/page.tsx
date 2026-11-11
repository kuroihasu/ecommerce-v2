import { adminApi } from "@/lib/admin/api";
import type { InventoryItem, StockMovement } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { InventoryManager } from "./InventoryManager";

export default async function InventoryPage() {
  const [inventory, movements] = await Promise.all([
    adminApi<{ threshold: number; items: InventoryItem[] }>("/inventory"),
    adminApi<StockMovement[]>("/inventory/movements"),
  ]);
  return (
    <AdminShell current="/admin/inventario">
      <h1 className="mb-1 text-2xl font-semibold">Inventario</h1>
      <p className="mb-6 text-zinc-600">
        El stock de cada talla y color en un solo lugar. Registra lo que llega, lo que vendes fuera de la web y las pérdidas: cada cambio queda en el historial. Con el costo de cada prenda ves cuánto vale tu inventario y cuánto ganas.
      </p>
      <InventoryManager initial={inventory.items} threshold={inventory.threshold} movements={movements} />
    </AdminShell>
  );
}
