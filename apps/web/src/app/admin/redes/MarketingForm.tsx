"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveStore } from "@/lib/admin/actions";
import type { StoreSettings } from "@/lib/admin/types";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-normal";
type Tracking = NonNullable<StoreSettings["tracking"]>;

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

function Card({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {intro && <p className="mt-1 text-sm text-zinc-500">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Mismos formatos que valida la API, para avisar antes de guardar.
const formats: Record<keyof Tracking, { re: RegExp; msg: string }> = {
  metaPixelId: { re: /^\d{5,20}$/, msg: "Son solo números, por ejemplo 123456789012345." },
  ga4Id: { re: /^G-[A-Z0-9]{4,15}$/, msg: "Empieza con G-, por ejemplo G-AB12CD34EF." },
  googleAdsId: { re: /^AW-\d{5,15}$/, msg: "Empieza con AW-, por ejemplo AW-123456789." },
  tiktokPixelId: { re: /^[A-Z0-9]{10,30}$/, msg: "Letras y números, por ejemplo C4ABCDEF1234567890." },
};

export function MarketingForm({ settings, feedUrl }: { settings: StoreSettings; feedUrl: string }) {
  const [social, setSocial] = useState({
    instagram: settings.instagram ?? "",
    tiktok: settings.tiktok ?? "",
    facebook: settings.facebook ?? "",
    whatsapp: settings.whatsapp ?? "",
  });
  const [t, setT] = useState<Tracking>({ metaPixelId: "", ga4Id: "", googleAdsId: "", tiktokPixelId: "", ...settings.tracking });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const clean = (k: keyof Tracking, v: string) => (k === "metaPixelId" ? v.replace(/\D/g, "") : v.trim().toUpperCase());
  const errors = (Object.keys(formats) as (keyof Tracking)[]).filter((k) => t[k] && !formats[k].re.test(t[k]!));

  const save = () =>
    start(async () => {
      if (errors.length) {
        setMsg({ ok: false, text: "Revisa los IDs marcados en rojo." });
        return;
      }
      const res = await saveStore({ settings: { ...social, tracking: t } });
      setMsg(res.ok ? { ok: true, text: "Guardado. La tienda ya usa estos datos." } : { ok: false, text: res.error });
    });

  const copy = async () => {
    await navigator.clipboard.writeText(feedUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pixel = (k: keyof Tracking, label: string, placeholder: string, where: string) => {
    const bad = errors.includes(k);
    return (
      <Field label={label} hint={bad ? <span className="text-red-700">{formats[k].msg}</span> : where}>
        <input
          className={`${input} font-mono ${bad ? "border-red-500" : ""}`}
          value={t[k] ?? ""}
          onChange={(e) => {
            setT((cur) => ({ ...cur, [k]: clean(k, e.target.value) }));
            setMsg(null);
          }}
          placeholder={placeholder}
          spellCheck={false}
          aria-invalid={bad}
        />
      </Field>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card title="Redes sociales" intro="Aparecen en el pie de página de la tienda.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Instagram"><input className={input} value={social.instagram} onChange={(e) => setSocial({ ...social, instagram: e.target.value })} placeholder="@tutienda" maxLength={60} /></Field>
          <Field label="TikTok"><input className={input} value={social.tiktok} onChange={(e) => setSocial({ ...social, tiktok: e.target.value })} placeholder="@tutienda" maxLength={60} /></Field>
          <Field label="Facebook"><input className={input} value={social.facebook} onChange={(e) => setSocial({ ...social, facebook: e.target.value })} placeholder="facebook.com/tutienda" maxLength={100} /></Field>
          <Field label="WhatsApp"><input className={input} value={social.whatsapp} onChange={(e) => setSocial({ ...social, whatsapp: e.target.value })} placeholder="+56 9 1234 5678" maxLength={30} /></Field>
        </div>
      </Card>

      <Card
        title="Píxeles de publicidad"
        intro="Con estos IDs, Meta, Google y TikTok saben quién vio un producto, quién lo agregó al carrito y quién fue a pagar. Así miden tus anuncios y se los muestran a quienes tienen más probabilidad de comprar. Deja vacío lo que no uses."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {pixel("metaPixelId", "Píxel de Meta (Facebook e Instagram)", "123456789012345", "Administrador de eventos de Meta → Orígenes de datos → tu píxel → ID.")}
          {pixel("ga4Id", "Google Analytics 4", "G-AB12CD34EF", "Analytics → Administrar → Flujos de datos → ID de medición.")}
          {pixel("googleAdsId", "Google Ads", "AW-123456789", "Google Ads → Objetivos → Conversiones → Etiqueta de Google → ID.")}
          {pixel("tiktokPixelId", "Píxel de TikTok", "C4ABCDEF1234567890", "TikTok Ads Manager → Herramientas → Eventos → tu píxel → ID.")}
        </div>
        <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Eventos que envía la tienda: vista de página, vio un producto, agregó al carrito e inició el pago. La compra se va a sumar cuando la tienda tenga pago en línea.
        </p>
      </Card>

      <Card
        title="Catálogo para anuncios"
        intro="Este enlace tiene todos tus productos con foto, precio, talla, color y stock, y se actualiza solo cuando cambias algo en Productos. Pégalo una vez en Google y en Meta."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={feedUrl} className={`${input} font-mono text-sm`} onFocus={(e) => e.target.select()} aria-label="Enlace del catálogo" />
          <button type="button" onClick={copy} className="h-10 shrink-0 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100">{copied ? "Copiado" : "Copiar"}</button>
          <a href={feedUrl} target="_blank" className="flex h-10 shrink-0 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100">Ver ↗</a>
        </div>
        <div className="mt-5 grid gap-5 text-sm md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Google (Shopping y Performance Max)</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600">
              <li>Entra a Google Merchant Center con la cuenta de tu tienda.</li>
              <li>Ve a Productos → Fuentes de datos → Agregar fuente.</li>
              <li>Elige &quot;Agregar productos desde un archivo&quot; y pega el enlace.</li>
              <li>Prográmalo para que se lea todos los días.</li>
              <li>Vincula Merchant Center con tu cuenta de Google Ads.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold">Meta (Facebook e Instagram)</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600">
              <li>Entra a Commerce Manager y crea un catálogo de comercio electrónico.</li>
              <li>Ve a Catálogo → Orígenes de datos → Agregar artículos.</li>
              <li>Elige &quot;Lista de datos&quot; → &quot;Feed programado&quot; y pega el enlace.</li>
              <li>Elige que se actualice cada día.</li>
              <li>Conecta el catálogo a tu píxel para hacer anuncios de catálogo y etiquetar productos en Instagram.</li>
            </ol>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
