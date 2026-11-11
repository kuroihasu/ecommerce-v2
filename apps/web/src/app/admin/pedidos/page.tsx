import { adminApi } from "@/lib/admin/api";
import type { AdminOrder } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { OrderList } from "./OrderList";

export default async function OrdersPage() {
  const orders = await adminApi<AdminOrder[]>("/orders");
  return (
    <AdminShell current="/admin/pedidos">
      <h1 className="mb-1 text-2xl font-semibold">Pedidos</h1>
      <p className="mb-6 text-zinc-600">Los pedidos de la tienda. Los pagados con Webpay o Mercado Pago se confirman solos; las transferencias las confirmas tú al ver el depósito.</p>
      <OrderList initial={orders} />
    </AdminShell>
  );
}
