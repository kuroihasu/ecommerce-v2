import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { PreviewBar } from "@/designs/PreviewBar";
import { CartCount } from "@/designs/BuyBox";
import { store } from "@/designs/catalog";

const font = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--font-mercado" });

const B = "/disenos/mercado";

export default function MercadoLayout({ children }: LayoutProps<"/disenos/mercado">) {
  return (
    <div className={`theme-mercado ${font.variable} flex min-h-screen flex-col bg-bg font-body text-ink`}>
      <PreviewBar current="mercado" />
      <header className="sticky top-0 z-20 bg-bg">
        <nav className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <Link href={B} className="text-3xl font-extrabold tracking-[-0.03em]">{store.name}</Link>
          <div className="hidden items-center gap-2 text-base font-medium md:flex">
            {[["Catálogo", "/catalogo"], ["Regalos", "#regalos"], ["Textil", "/catalogo?c=textil"], ["Cerámica", "/catalogo?c=ceramica"]].map(([l, h]) => (
              <Link key={l} href={`${B}${h}`} className="rounded-full px-4 py-2 transition-colors hover:bg-surface">{l}</Link>
            ))}
          </div>
          <Link href={`${B}/carrito`} className="flex h-12 items-center gap-3 rounded-full bg-accent pr-2 pl-5 text-base font-medium text-accent-ink transition-transform active:scale-95">
            Carrito
            <CartCount direction="mercado" className="grid h-8 min-w-8 place-items-center rounded-full bg-field px-2 text-field-ink" />
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mx-4 mt-32 mb-4 rounded-brand bg-accent px-6 pt-16 pb-8 text-accent-ink sm:mx-6 md:px-12">
        <div className="grid gap-10 text-lg md:grid-cols-3">
          <p className="text-3xl font-bold leading-tight tracking-[-0.02em]">¿Dudas con tu pedido? Te respondemos por WhatsApp en el día.</p>
          <div className="flex flex-col gap-2">
            <Link href={`${B}/catalogo`}>Catálogo</Link>
            <a href="#checkout">Despachos</a>
            <a href="#checkout">Cambios y devoluciones</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href={`mailto:${store.email}`}>{store.email}</a>
            <span>{store.whatsapp}</span>
            <span>{store.instagram}</span>
          </div>
        </div>
        <p className="mt-20 text-[13vw] font-extrabold leading-[0.85] tracking-[-0.05em]">{store.name}</p>
        <p className="mt-6 text-sm opacity-75">Fotografías de muestra: Unsplash. Se reemplazan por las de cada tienda.</p>
      </footer>
    </div>
  );
}
