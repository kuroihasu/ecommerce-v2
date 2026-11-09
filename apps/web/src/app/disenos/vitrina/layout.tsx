import Link from "next/link";
import { Archivo } from "next/font/google";
import { PreviewBar } from "@/designs/PreviewBar";
import { CartCount } from "@/designs/BuyBox";
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
            <span key={i}>Despacho gratis sobre $40.000 · Hecho a mano en Chile · Cambios en 30 días ·</span>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-20 bg-bg">
        <nav className="flex items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <Link href={B} className="text-2xl font-black uppercase tracking-[-0.02em] [font-stretch:75%]">{store.name}</Link>
          <div className="hidden items-center gap-8 text-base font-semibold md:flex">
            <Link href={`${B}/catalogo`} className="hover:text-accent">Todo</Link>
            <Link href={`${B}/catalogo?c=ceramica`} className="hover:text-accent">Cerámica</Link>
            <Link href={`${B}/catalogo?c=textil`} className="hover:text-accent">Textil</Link>
            <Link href={`${B}/catalogo?c=velas`} className="hover:text-accent">Velas</Link>
          </div>
          <Link href={`${B}/carrito`} className="flex h-11 items-center gap-3 bg-ink px-5 text-base font-semibold text-bg transition-colors hover:bg-accent">
            Carrito <CartCount direction="vitrina" />
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-32 bg-field text-field-ink">
        <div className="grid gap-10 px-4 py-16 text-lg sm:px-6 md:grid-cols-4">
          <p className="md:col-span-2 max-w-md">{store.tagline}. Despacho a todo Chile en 2 a 5 días hábiles.</p>
          <div className="flex flex-col gap-2">
            <Link href={`${B}/catalogo`} className="hover:text-accent">Catálogo</Link>
            <a href="#checkout" className="hover:text-accent">Cambios y devoluciones</a>
            <a href="#checkout" className="hover:text-accent">Preguntas frecuentes</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href={`mailto:${store.email}`} className="hover:text-accent">{store.email}</a>
            <span>{store.instagram}</span>
            <span>{store.whatsapp}</span>
          </div>
        </div>
        <p className="px-2 text-[15.5vw] font-black uppercase leading-[0.8] tracking-[-0.04em] [font-stretch:62%]">{store.name}</p>
        <p className="px-4 py-6 text-sm text-field-ink/70 sm:px-6">Fotografías de muestra: Unsplash. Se reemplazan por las de cada tienda.</p>
      </footer>
    </div>
  );
}
