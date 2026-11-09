import { CartView } from "@/designs/CartView";

export function Cart() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <h1 className="rise py-10 text-[clamp(3rem,7vw,7rem)] font-extrabold leading-none tracking-[-0.04em]">Tu carrito</h1>
      <CartView direction="tienda" base="" round />
    </div>
  );
}
