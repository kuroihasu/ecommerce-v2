import Link from "next/link";
import { connection } from "next/server";
import { adminApi, ApiError } from "@/lib/admin/api";
import type { AccountingReport, MonthRow } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { Ledger } from "./Ledger";
import { MonthlyChart } from "./MonthlyChart";
import { Summary } from "./Summary";
import { SalesBook } from "./SalesBook";

const TZ = "America/Santiago";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const chileToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
const monthRange = (y: number, m: number) => ({ from: `${y}-${String(m).padStart(2, "0")}-01`, to: lastDay(y, m) });
const monthName = (from: string) => new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${from}T12:00:00Z`));
const showDay = (d: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

// Período elegido en la URL (?desde=&hasta=). Por defecto, el mes en curso.
function period(desde?: string | string[], hasta?: string | string[]) {
  const [y, m] = chileToday().split("-").map(Number);
  const presets = [
    { label: "Este mes", ...monthRange(y, m) },
    { label: "Mes anterior", ...(m === 1 ? monthRange(y - 1, 12) : monthRange(y, m - 1)) },
    { label: `Año ${y}`, from: `${y}-01-01`, to: `${y}-12-31` },
    { label: `Año ${y - 1}`, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` },
  ];
  const from = typeof desde === "string" && DAY_RE.test(desde) ? desde : presets[0].from;
  const to = typeof hasta === "string" && DAY_RE.test(hasta) && hasta >= from ? hasta : from === presets[0].from ? presets[0].to : from;
  const isMonth = from.endsWith("-01") && to === lastDay(Number(from.slice(0, 4)), Number(from.slice(5, 7)));
  const label = isMonth ? monthName(from) : `${showDay(from)} – ${showDay(to)}`;
  return { from, to, label, presets };
}

export default async function AccountingPage({ searchParams }: PageProps<"/admin/contabilidad">) {
  const { desde, hasta } = await searchParams;
  await connection(); // "este mes" depende de la fecha de hoy: se calcula en cada visita
  const p = period(desde, hasta);
  let report: AccountingReport, months: MonthRow[];
  try {
    [report, months] = await Promise.all([
      adminApi<AccountingReport>(`/accounting/report?from=${p.from}&to=${p.to}`),
      adminApi<MonthRow[]>("/accounting/monthly"),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 400)) {
      return (
        <AdminShell current="/admin/contabilidad">
          <h1 className="mb-2 text-2xl font-semibold">Contabilidad</h1>
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900">{e.message}</p>
        </AdminShell>
      );
    }
    throw e;
  }

  return (
    <AdminShell current="/admin/contabilidad">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Contabilidad</h1>
          <p className="max-w-2xl text-zinc-600">
            Las ventas de la tienda online se suman solas. Anota aquí tus otros ingresos (ventas por Instagram, en feria o en local) y tus gastos, y descarga los libros en CSV para tu contador.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {p.presets.map((x) => {
          const active = x.from === p.from && x.to === p.to;
          return (
            <Link key={x.label} href={`/admin/contabilidad?desde=${x.from}&hasta=${x.to}`} className={`h-9 rounded-full px-4 text-sm leading-9 ${active ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white hover:bg-zinc-100"}`}>
              {x.label}
            </Link>
          );
        })}
        <form className="flex flex-wrap items-center gap-2 text-sm" action="/admin/contabilidad">
          <input type="date" name="desde" defaultValue={p.from} aria-label="Desde" className="h-9 rounded-lg border border-zinc-300 bg-white px-2" />
          <span className="text-zinc-500">a</span>
          <input type="date" name="hasta" defaultValue={p.to} aria-label="Hasta" className="h-9 rounded-lg border border-zinc-300 bg-white px-2" />
          <button className="h-9 rounded-lg border border-zinc-300 bg-white px-3 hover:bg-zinc-100">Ver</button>
        </form>
      </div>

      <h2 className="mb-3 text-lg font-semibold first-letter:uppercase">{p.label}</h2>
      <Summary s={report.summary} />
      <MonthlyChart rows={months} />
      <Ledger key={`${p.from}:${p.to}`} initial={report.entries} period={{ from: p.from, to: p.to }} />
      <SalesBook sales={report.sales} period={{ from: p.from, to: p.to }} summary={report.summary} entries={report.entries} />
    </AdminShell>
  );
}
