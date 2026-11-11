import type { Metadata } from "next";
import { Suspense } from "react";
import { photoUrl } from "@/designs/images";
import { getCatalog } from "@/lib/catalog";
import { ThemeRoot } from "@/themes/ThemeRoot";

// Nombre, frase y foto de la tienda para Google y para cuando se comparte el enlace.
export async function generateMetadata(): Promise<Metadata> {
  const { store } = await getCatalog();
  const description = store.tagline;
  const images = [photoUrl("shop")];
  return {
    title: store.name,
    description,
    openGraph: { title: store.name, description, images, type: "website", siteName: store.name, locale: "es_CL" },
    twitter: { card: "summary_large_image", title: store.name, description, images },
  };
}

export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ThemeRoot>{children}</ThemeRoot>
    </Suspense>
  );
}
