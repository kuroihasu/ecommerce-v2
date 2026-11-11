import { adminApi, ApiError } from "@/lib/admin/api";
import type { Campaign, Insights, IntegrationSlug, IntegrationStatus } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { Connections } from "./Connections";

const clp = (n: number, currency = "CLP") => new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat("es-CL").format(Math.round(n));
const day = (iso: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(new Date(iso));

// Cada cuenta se consulta por separado: si una falla, la otra igual se muestra.
async function load(p: IntegrationSlug): Promise<{ data?: Insights; error?: string }> {
  try {
    return { data: await adminApi<Insights>(`/integrations/${p}/insights`) };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
}

function CampaignTable({ title, ads }: { title: string; ads: NonNullable<Insights["ads"]> }) {
  const t = ads.campaigns.reduce(
    (s, c) => ({ spend: s.spend + c.spend, impressions: s.impressions + c.impressions, clicks: s.clicks + c.clicks, purchases: s.purchases + c.purchases, revenue: s.revenue + c.revenue }),
    { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 },
  );
  const roas = t.spend > 0 && t.revenue > 0 ? (t.revenue / t.spend).toFixed(1) : null;
  const kpis = [
    ["Invertido", clp(t.spend, ads.currency)],
    ["Impresiones", num(t.impressions)],
    ["Clics", num(t.clicks)],
    ["Compras", num(t.purchases)],
    ["Retorno", roas ? `${roas}×` : "—"],
  ];
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-zinc-500">{ads.account} · últimos 30 días</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {kpis.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-zinc-50 px-3 py-2">
            <dt className="text-xs text-zinc-500">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {ads.campaigns.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No hubo campañas con actividad en los últimos 30 días.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-zinc-500">
              <tr>
                <th className="py-2 font-medium">Campaña</th>
                {["Invertido", "Impresiones", "Clics", "CTR", "Compras", "Ventas"].map((h) => <th key={h} className="py-2 text-right font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {ads.campaigns.map((c: Campaign, k) => (
                <tr key={`${c.name}-${k}`}>
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 text-right tabular-nums">{clp(c.spend, ads.currency)}</td>
                  <td className="py-2 text-right tabular-nums">{num(c.impressions)}</td>
                  <td className="py-2 text-right tabular-nums">{num(c.clicks)}</td>
                  <td className="py-2 text-right tabular-nums">{c.ctr.toFixed(1)}%</td>
                  <td className="py-2 text-right tabular-nums">{num(c.purchases)}</td>
                  <td className="py-2 text-right tabular-nums">{c.revenue ? clp(c.revenue, ads.currency) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Instagram({ ig }: { ig: NonNullable<Insights["instagram"]> }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Instagram · @{ig.username}</h2>
        {ig.followers !== null && <p className="text-sm text-zinc-500">{num(ig.followers)} seguidores</p>}
      </div>
      {ig.posts.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Todavía no hay publicaciones.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ig.posts.map((p) => (
            <li key={p.id}>
              <a href={p.url} target="_blank" rel="noreferrer" className="group block">
                <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100">
                  {/* Fotos de Instagram: dominio externo y URLs que vencen, por eso <img> y no next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{p.caption || "Sin texto"}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {day(p.date)} · ♥ {p.likes ?? "—"} · 💬 {p.comments ?? "—"}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function PublicationsPage({ searchParams }: PageProps<"/admin/publicaciones">) {
  const q = await searchParams;
  const status = await adminApi<IntegrationStatus[]>("/integrations");
  const connected = status.filter((s) => s.connected && !s.expired).map((s) => s.provider);
  const [meta, google] = await Promise.all([
    connected.includes("meta") ? load("meta") : null,
    connected.includes("google") ? load("google") : null,
  ]);
  const notice = typeof q.conectado === "string" ? `Listo, ${q.conectado === "meta" ? "Meta" : "Google Ads"} quedó conectado.` : null;
  const error = typeof q.error === "string" ? q.error.slice(0, 300) : null;

  return (
    <AdminShell current="/admin/publicaciones">
      <h1 className="mb-1 text-2xl font-semibold">Publicaciones y anuncios</h1>
      <p className="mb-6 text-zinc-600">Conecta tus cuentas para ver tus últimas publicaciones de Instagram y cómo rinden tus anuncios, sin salir del panel.</p>
      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-col gap-6">
        <Connections status={status} failing={[meta?.error && "meta", google?.error && "google"].filter((x): x is IntegrationSlug => !!x)} />
        {[meta, google].map((r, k) => r?.error && <p key={k} role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{r.error}</p>)}
        {meta?.data?.instagram && <Instagram ig={meta.data.instagram} />}
        {meta?.data?.ads && <CampaignTable title="Anuncios en Meta (Facebook e Instagram)" ads={meta.data.ads} />}
        {google?.data?.ads && <CampaignTable title="Google Ads" ads={google.data.ads} />}
      </div>
    </AdminShell>
  );
}
