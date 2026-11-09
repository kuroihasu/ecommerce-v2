import Link from "next/link";
import { Archivo } from "next/font/google";
import { PreviewBar } from "@/designs/PreviewBar";
import { CartCount } from "@/designs/BuyBox";
import { Newsletter } from "@/designs/extras";
import { store } from "@/designs/catalog";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-vitrina" });

const B = "/disenos/vitrina";

export default function VitrinaLayout({ children }: LayoutProps<"/disenos/vitrina">) {
  return (
    <div className={`theme-vitrina ${archivo.variable} flex min-h-screen flex-col bg-bg font-body text-ink`}>
      <PreviewBar current="vitrina" />
      <div className="overflow-hidden bg-accent py-2 text-base font-semibold text-accent-ink">
        <div className="marquee flex w-max gap-12 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>Envíos a todo Chile · 10% OFF con el código {store.discountCode} · {store.installments} cuotas sin interés ·</span>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-30 bg-bg">
        <nav className="flex items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <Link href={B} className="text-3xl font-black uppercase tracking-[-0.02em] [font-stretch:75%]">{store.name}</Link>
          <div className="hidden items-center gap-7 text-base font-semibold uppercase md:flex">
            <Link href={`${B}/catalogo?o=nuevos`} className="transition-colors hover:text-accent">Novedades</Link>
            <Link href={`${B}/catalogo?l=mujer`} className="transition-colors hover:text-accent">Girls</Link>
            <Link href={`${B}/catalogo?l=hombre`} className="transition-colors hover:text-accent">Men</Link>
            <Link href={`${B}/catalogo?c=polerones`} className="transition-colors hover:text-accent">Hoodies</Link>
            <Link href={`${B}/catalogo?o=ofertas`} className="text-accent">Sale</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`${B}/catalogo`} className="text-base font-semibold uppercase md:hidden">Tienda</Link>
            <Link href={`${B}/carrito`} className="flex h-11 items-center gap-3 bg-ink px-5 text-base font-semibold text-bg transition-colors hover:bg-accent">
              Carrito <CartCount direction="vitrina" />
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-32 bg-field text-field-ink">
        <div className="grid gap-10 px-4 py-16 text-lg sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="text-5xl font-black uppercase leading-[0.85] [font-stretch:62%]">Entra al club: 10% OFF</p>
            <Newsletter inputClass="bg-bg text-ink" buttonClass="bg-accent text-accent-ink font-semibold" label="Quiero mi código" />
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`${B}/catalogo`} className="hover:text-accent">Toda la colección</Link>
            <a href="#checkout" className="hover:text-accent">Envíos en Chile</a>
            <a href="#checkout" className="hover:text-accent">Rastrear mi pedido</a>
            <a href="#checkout" className="hover:text-accent">Cambios y devoluciones</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href={`mailto:${store.email}`} className="hover:text-accent">{store.email}</a>
            <span>Instagram {store.instagram}</span>
            <span>TikTok {store.tiktok}</span>
          </div>
        </div>
        <p className="px-2 text-[33vw] font-black uppercase leading-[0.78] tracking-[-0.03em] [font-stretch:62%]">{store.name}</p>
        <p className="px-4 py-6 text-sm text-field-ink/70 sm:px-6">Fotografías de muestra: Unsplash. Se reemplazan por las de cada tienda.</p>
      </footer>
    </div>
  );
}
