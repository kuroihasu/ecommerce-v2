import { Suspense } from "react";
import { ThemeRoot } from "@/themes/ThemeRoot";

export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ThemeRoot>{children}</ThemeRoot>
    </Suspense>
  );
}
