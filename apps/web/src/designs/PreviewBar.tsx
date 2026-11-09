import Link from "next/link";

const directions = [
  { href: "/disenos/taller", label: "A · Taller" },
  { href: "/disenos/vitrina", label: "B · Vitrina" },
  { href: "/disenos/mercado", label: "C · Mercado" },
];

// Barra solo para la etapa de elección de diseño: permite saltar entre direcciones.
export function PreviewBar({ current }: { current: string }) {
  return (
    <div className="bg-[#111] px-4 py-2 text-sm text-white sm:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-1">
        <Link href="/disenos" className="text-white/70 hover:text-white">Propuestas de diseño</Link>
        {directions.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className={d.href.endsWith(current) ? "text-white underline underline-offset-4" : "text-white/70 hover:text-white"}
          >
            {d.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
