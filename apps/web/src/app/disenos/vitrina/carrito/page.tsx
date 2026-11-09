import { CartView } from "@/designs/CartView";

export default function VitrinaCart() {
  return (
    <div className="px-4 sm:px-6">
      <h1 className="rise pt-4 pb-10 text-[clamp(3.6rem,12vw,12rem)] font-black uppercase leading-[0.82] tracking-[-0.025em] [font-stretch:62%] [word-spacing:0.08em]">Carrito</h1>
      <CartView direction="vitrina" base="/disenos/vitrina" checkoutLabel="Pagar ahora" />
    </div>
  );
}
