import { adminApi } from "@/lib/admin/api";
import type { AdminProduct } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { NewProduct } from "./NewProduct";
import { ProductTable } from "./ProductTable";

export default async function ProductsPage() {
  const products = await adminApi<AdminProduct[]>("/products");
  return (
    <AdminShell current="/admin/productos">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-zinc-600">{products.filter((p) => p.status === "ACTIVE").length} publicados de {products.length}</p>
        </div>
        <NewProduct />
      </div>
      <ProductTable products={products} />
    </AdminShell>
  );
}
