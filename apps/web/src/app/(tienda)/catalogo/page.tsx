import { getActiveTheme } from "@/themes/resolve";

export default async function CatalogPage() {
  const { def } = await getActiveTheme();
  return <def.Catalog />;
}
