import Link from "next/link";
import { adminApi } from "@/lib/admin/api";
import type { AdminProduct, AdminStore } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { NewProduct } from "./NewProduct";
import { ProductTable } from "./ProductTable";

export default async function ProductsPage() {
  const [products, store] = await Promise.all([adminApi<AdminProduct[]>("/products"), adminApi<AdminStore>("")]);
  // Aviso de reposición: variantes de productos publicados con stock bajo o agotadas.
  const threshold = store.settings.lowStockThreshold ?? 3;
  const live = products.filter((p) => p.status === "ACTIVE").flatMap((p) => p.variants);
  const out = live.filter((v) => v.stock === 0).length;
  const low = live.filter((v) => v.stock > 0 && v.stock <= threshold).length;
  return (
    <AdminShell current="/admin/productos">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-zinc-600">{products.filter((p) => p.status === "ACTIVE").length} publicados de {products.length}</p>
        </div>
        <NewProduct />
      </div>
      {low + out > 0 && (
        <Link href="/admin/inventario" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 hover:bg-amber-100">
          <span>
            <strong className="font-semibold">Por reponer:</strong> {low > 0 && `${low} ${low === 1 ? "variante" : "variantes"} con ${threshold} unidades o menos`}
            {low > 0 && out > 0 && " y "}
            {out > 0 && `${out} ${out === 1 ? "agotada" : "agotadas"}`}.
          </span>
          <span className="text-sm font-medium">Ver inventario →</span>
        </Link>
      )}
      <ProductTable products={products} />
    </AdminShell>
  );
}
