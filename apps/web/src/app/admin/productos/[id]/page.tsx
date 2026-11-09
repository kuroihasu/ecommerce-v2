import { notFound } from "next/navigation";
import { adminApi, ApiError } from "@/lib/admin/api";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";
import { AdminShell } from "../../AdminShell";
import { ProductEditor } from "./ProductEditor";

export default async function ProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    adminApi<AdminProduct>(`/products/${encodeURIComponent(id)}`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }),
    adminApi<AdminCategory[]>("/categories"),
  ]);
  return (
    <AdminShell current="/admin/productos">
      <ProductEditor key={product.id} initial={product} categories={categories} />
    </AdminShell>
  );
}
