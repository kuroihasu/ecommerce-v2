import { Suspense } from "react";
import { CatalogView } from "./CatalogView";

export function Catalog() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
      <Suspense>
        <CatalogView />
      </Suspense>
    </div>
  );
}
