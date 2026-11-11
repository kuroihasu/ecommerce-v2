import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getOrder } from "@/lib/orders";
import { OrderView } from "@/designs/OrderView";
import { ORDER_KEY_COOKIE } from "@/lib/order-key";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/pedido/[id]">) {
  const [{ id }, sp, jar] = await Promise.all([params, searchParams, cookies()]);
  // La llave llega en una cookie (src/proxy.ts la saca de la URL); ?k= queda de respaldo.
  const key = jar.get(ORDER_KEY_COOKIE)?.value ?? (typeof sp.k === "string" ? sp.k : "");
  const order = key ? await getOrder(id, key) : null;
  return (
    <div className="mx-auto max-w-[900px] px-4 pb-24 sm:px-6">
      {order ? (
        <OrderView order={order} orderKey={key} />
      ) : (
        <div className="flex flex-col items-start gap-6 py-16">
          <h1 className="font-display text-5xl leading-none">No encontramos ese pedido</h1>
          <p className="text-lg">Revisa que el enlace esté completo. Si pagaste y no lo encuentras, escríbenos y lo revisamos.</p>
          <Link href="/" className="rounded-brand bg-accent px-8 py-4 text-lg text-accent-ink">Volver a la tienda</Link>
        </div>
      )}
    </div>
  );
}
