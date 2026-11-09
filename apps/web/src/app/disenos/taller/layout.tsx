import Link from "next/link";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import { PreviewBar } from "@/designs/PreviewBar";
import { CartCount } from "@/designs/BuyBox";
import { store } from "@/designs/catalog";

const display = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-taller-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-taller-body" });

const B = "/disenos/taller";

export default function TallerLayout({ children }: LayoutProps<"/disenos/taller">) {
  return (
    <div className={`theme-taller ${display.variable} ${body.variable} flex min-h-screen flex-col bg-bg font-body text-ink`}>
      <PreviewBar current="taller" />
      <header className="sticky top-0 z-20 bg-bg">
        <nav className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-5 sm:px-8">
          <Link href={B} className="font-display text-3xl leading-none">{store.name}</Link>
          <div className="hidden items-center gap-8 text-base md:flex">
            <Link href={`${B}/catalogo`} className="hover:opacity-60">Catálogo</Link>
            <Link href={`${B}/catalogo#ceramica`} className="hover:opacity-60">Cerámica</Link>
            <Link href={`${B}/catalogo#textil`} className="hover:opacity-60">Textil</Link>
            <Link href={`${B}#origen`} className="hover:opacity-60">Origen</Link>
          </div>
          <Link href={`${B}/carrito`} className="text-base hover:opacity-60">
            Carrito (<CartCount direction="taller" />)
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-40 bg-field px-5 pt-20 pb-8 text-field-ink sm:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-12 md:grid-cols-3">
          <p className="text-lg md:col-span-1">Objetos hechos a mano por talleres de todo Chile. Despacho a todo el país, gratis sobre $40.000.</p>
          <div className="flex flex-col gap-2 text-lg">
            <Link href={`${B}/catalogo`}>Catálogo</Link>
            <Link href={`${B}#origen`}>Talleres</Link>
            <a href="#checkout">Cambios y devoluciones</a>
          </div>
          <div className="flex flex-col gap-2 text-lg">
            <a href={`mailto:${store.email}`}>{store.email}</a>
            <span>Instagram {store.instagram}</span>
            <span>WhatsApp {store.whatsapp}</span>
          </div>
        </div>
        <p className="mx-auto mt-24 max-w-[1440px] font-display text-[19vw] leading-[0.8] tracking-[-0.03em]">{store.name}</p>
        <p className="mx-auto mt-6 max-w-[1440px] text-sm opacity-70">Fotografías de muestra: Unsplash. Se reemplazan por las de cada tienda.</p>
      </footer>
    </div>
  );
}
