import Link from "next/link";
import { CartCount } from "@/designs/BuyBox";
import { AnnouncementRotator, Newsletter } from "@/designs/extras";
import { formatCLP } from "@/designs/catalog";
import { getCatalog } from "@/lib/catalog";



export async function Layout({ children }: { children: React.ReactNode }) {
  const { store } = await getCatalog();
  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink">
      <AnnouncementRotator
        className="bg-field text-field-ink"
        items={[
          `Envío gratis sobre ${formatCLP(store.freeShippingFrom)}`,
          `${store.installments} cuotas sin interés con Mercado Pago`,
          `10% en tu primera compra con el código ${store.discountCode}`,
        ]}
      />
      <header className="sticky top-0 z-30 bg-bg">
        <nav className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 py-5 sm:px-8">
          <div className="hidden items-center gap-7 text-base md:flex">
            <Link href={`/catalogo?o=nuevos`} className="hover:opacity-60">Lo nuevo</Link>
            <Link href={`/catalogo?l=mujer`} className="hover:opacity-60">Mujer</Link>
            <Link href={`/catalogo?l=hombre`} className="hover:opacity-60">Hombre</Link>
            <Link href={`/catalogo?o=ofertas`} className="hover:opacity-60">Ofertas</Link>
          </div>
          <Link href={`/catalogo`} className="text-base md:hidden">Catálogo</Link>
          <Link href="/" className="font-display text-4xl leading-none tracking-[0.04em]">{store.name}</Link>
          <div className="flex items-center justify-end gap-6 text-base">
            <Link href="/catalogo#buscar" className="hidden hover:opacity-60 md:inline">Buscar</Link>
            <Link href={`/carrito`} className="hover:opacity-60">Carrito (<CartCount direction="tienda" />)</Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-40 bg-field px-5 pt-20 pb-8 text-field-ink sm:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-12 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="font-display text-4xl leading-tight">10% en tu primera compra</p>
            <Newsletter inputClass="bg-bg text-ink" buttonClass="bg-ink text-bg" />
          </div>
          <div className="flex flex-col gap-2 text-lg">
            <Link href={`/catalogo`}>Toda la colección</Link>
            <a href="#checkout">Envíos en Chile</a>
            <a href="#checkout">Rastrear mi pedido</a>
            <a href="#checkout">Cambios y devoluciones</a>
          </div>
          <div className="flex flex-col gap-2 text-lg">
            <a href={`mailto:${store.email}`}>{store.email}</a>
            <span>Instagram {store.instagram}</span>
            <span>TikTok {store.tiktok}</span>
            <span>WhatsApp {store.whatsapp}</span>
          </div>
        </div>
        <p className="mx-auto mt-24 max-w-[1440px] text-center font-display text-[24vw] leading-[0.78] tracking-[0.02em]">{store.name}</p>
        <p className="mx-auto mt-6 max-w-[1440px] text-sm opacity-70">Fotografías de muestra: Unsplash. Se reemplazan por las de cada tienda.</p>
      </footer>
    </div>
  );
}
