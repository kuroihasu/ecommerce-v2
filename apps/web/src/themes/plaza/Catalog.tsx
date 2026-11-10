import { Suspense } from "react";
import { CatalogList } from "./CatalogList";

export function Catalog() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <Suspense>
        <CatalogList />
      </Suspense>
    </div>
  );
}
