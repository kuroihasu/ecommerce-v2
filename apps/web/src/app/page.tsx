import { Suspense } from "react";
import { formatCLP, getProducts } from "@/lib/api";

// Página provisoria: solo comprueba que el front lee el catálogo desde la API.
// El diseño real llega en el paso 2.
async function ProductList() {
  const products = await getProducts();
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {products.map((p) => (
        <li key={p.id} className="rounded-lg border border-black/10 p-4">
          <p className="font-medium">{p.name}</p>
          <p className="text-sm opacity-70">{formatCLP(p.variants[0]?.price ?? 0)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Tienda Demo</h1>
      <Suspense fallback={<p>Cargando productos…</p>}>
        <ProductList />
      </Suspense>
    </main>
  );
}
