"use client";

import { createContext, useContext, type ReactNode } from "react";
import { demoCatalog, type Catalog } from "./catalog";

// El catálogo llega una vez desde el servidor y lo leen los componentes de cliente
// (carrito, filtros, selector de compra) sin volver a pedirlo.
const CatalogContext = createContext<Catalog>(demoCatalog);

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export const useCatalogData = () => useContext(CatalogContext);
