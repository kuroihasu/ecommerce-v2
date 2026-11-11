import { getActiveTheme } from "@/themes/resolve";

export default async function CartPage() {
  const { def } = await getActiveTheme();
  return <def.Cart />;
}
