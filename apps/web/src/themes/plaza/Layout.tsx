import Link from "next/link";
import { CartCount } from "@/designs/BuyBox";
import { AnnouncementRotator, Newsletter } from "@/designs/extras";
import { formatCLP } from "@/designs/catalog";
import { getCatalog } from "@/lib/catalog";
import { sectionVisible } from "@/themes/sections";



export async function Layout({ children }: { children: React.ReactNode }) {
  const { store } = await getCatalog();
  const show = sectionVisible(store);
  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink">
      {show("announce") && (
        <AnnouncementRotator
          className="bg-field font-medium text-field-ink"
          items={[
            "Envíos a todo Chile en 2 a 5 días",
            `Gratis sobre ${formatCLP(store.freeShippingFrom)}`,
            `Código ${store.discountCode}: 10% en tu primera compra`,
          ]}
        />
      )}
      <header className="sticky top-0 z-30 bg-bg">
        <nav className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-4xl tracking-[-0.01em]">{store.name.charAt(0) + store.name.slice(1).toLowerCase()}</Link>
          <div className="hidden items-center gap-1 text-base font-medium lg:flex">
            {[["Lo nuevo", "/catalogo?o=nuevos"], ["Poleras", "/catalogo?c=poleras"], ["Pantalones", "/catalogo?c=pantalones"], ["Vestidos", "/catalogo?c=vestidos"], ["Accesorios", "/catalogo?c=accesorios"], ["Ofertas", "/catalogo?o=ofertas"]].map(([l, h]) => (
              <Link key={l} href={`${h}`} className={`rounded-full px-4 py-2 transition-colors hover:bg-surface ${l === "Ofertas" ? "bg-[var(--field-2)]" : ""}`}>{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/catalogo`} className="rounded-full bg-surface px-4 py-3 text-base font-medium lg:hidden">Tienda</Link>
            <Link href="/catalogo#buscar" aria-label="Buscar" className="grid size-12 place-items-center rounded-full bg-surface transition-colors hover:bg-ink/10">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </Link>
            <Link href={`/carrito`} className="flex h-12 items-center gap-3 rounded-full bg-accent pr-2 pl-5 text-base font-medium text-accent-ink transition-transform hover:scale-[1.03] active:scale-95">
              Carrito
              <CartCount direction="tienda" className="grid h-8 min-w-8 place-items-center rounded-full bg-field px-2 text-field-ink" />
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mx-4 mt-32 mb-4 rounded-brand bg-accent px-6 pt-16 pb-8 text-accent-ink sm:mx-6 md:px-12">
        <div className="grid gap-10 text-lg md:grid-cols-[2fr_1fr_1fr]">
          {show("newsletter") && (
            <div className="flex flex-col gap-5">
              <p className="font-display text-5xl leading-tight">Suscríbete y te regalamos 10% en tu primera compra.</p>
              <Newsletter inputClass="rounded-full bg-bg text-ink" buttonClass="rounded-full bg-field text-field-ink font-semibold" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Link href={`/catalogo`}>Todos los productos</Link>
            <a href="#checkout">Envíos</a>
            <a href="#checkout">Rastrear mi pedido</a>
            <a href="#checkout">Cambios y devoluciones</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href={`mailto:${store.email}`}>{store.email}</a>
            <span>WhatsApp {store.whatsapp}</span>
            <span>Instagram {store.instagram}</span>
            {store.facebook && <span>Facebook {store.facebook}</span>}
            <span>Santiago, Chile</span>
          </div>
        </div>
        <p className="mt-20 text-[26vw] font-display font-normal leading-[0.8] tracking-[-0.02em]">{store.name.charAt(0) + store.name.slice(1).toLowerCase()}</p>
        <p className="mt-6 text-sm opacity-75">Fotografías de muestra: Unsplash. Se reemplazan por las de cada tienda.</p>
      </footer>
    </div>
  );
}
