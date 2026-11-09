import { CartView } from "@/designs/CartView";

export function Cart() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
      <h1 className="rise py-12 font-display text-[clamp(3.5rem,7vw,7rem)] leading-none tracking-[-0.03em]">Tu carrito</h1>
      <CartView direction="tienda" base="" />
    </div>
  );
}
