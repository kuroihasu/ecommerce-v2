import { Suspense } from "react";
import { CatalogGrid } from "./CatalogGrid";

export function Catalog() {
  return (
    <div className="px-4 sm:px-6">
      <Suspense>
        <CatalogGrid />
      </Suspense>
    </div>
  );
}
