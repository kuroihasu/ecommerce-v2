import { Suspense } from "react";
import { CatalogGrid } from "./CatalogGrid";

export default function VitrinaCatalog() {
  return (
    <div className="px-4 sm:px-6">
      <Suspense>
        <CatalogGrid />
      </Suspense>
    </div>
  );
}
