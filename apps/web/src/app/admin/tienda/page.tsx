import { adminApi } from "@/lib/admin/api";
import type { AdminCategory, AdminStore } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { Categories } from "./Categories";
import { SettingsForm } from "./SettingsForm";

export default async function StorePage() {
  const [store, categories] = await Promise.all([adminApi<AdminStore>(""), adminApi<AdminCategory[]>("/categories")]);
  return (
    <AdminShell current="/admin/tienda">
      <h1 className="mb-1 text-2xl font-semibold">Datos de la tienda</h1>
      <p className="mb-6 text-zinc-600">Contacto, envíos, cuotas y categorías.</p>
      <div className="flex flex-col gap-6">
        <SettingsForm store={store} />
        <Categories categories={categories} />
      </div>
    </AdminShell>
  );
}
