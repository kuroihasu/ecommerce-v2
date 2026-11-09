import { Suspense } from "react";
import { CatalogGrid } from "./CatalogGrid";

export default function VitrinaCatalog() {
  return (
    <div className="px-4 sm:px-6">
      <h1 className="rise pt-4 pb-8 text-[clamp(3.6rem,12vw,12rem)] font-black uppercase leading-[0.82] tracking-[-0.04em] [font-stretch:62%]">Catálogo</h1>
      <Suspense>
        <CatalogGrid />
      </Suspense>
    </div>
  );
}
