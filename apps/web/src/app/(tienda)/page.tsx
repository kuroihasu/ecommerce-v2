import { getActiveTheme } from "@/themes/resolve";

export default async function HomePage() {
  const { def } = await getActiveTheme();
  return <def.Home />;
}
