import type { Metadata } from "next";
import { Checkout } from "@/designs/Checkout";
import { paymentMethods } from "@/lib/orders";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const [methods, sp] = await Promise.all([paymentMethods(), searchParams]);
  const code = typeof sp.codigo === "string" ? sp.codigo.slice(0, 30) : "";
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <h1 className="py-10 font-display text-[clamp(2.6rem,5vw,4.5rem)] leading-none">Finalizar compra</h1>
      <Checkout methods={methods} initialCode={code} initialRegion={sp.envio === "regiones" ? "regiones" : "rm"} />
    </div>
  );
}
