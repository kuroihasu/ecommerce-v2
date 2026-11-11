"use client";

import { useState, useTransition } from "react";
import { saveStore } from "@/lib/admin/actions";
import { photoUrl } from "@/designs/images";
import { HERO_MAX, defaultSlides, heroDefaults, type HeroConfig, type HeroSlide } from "@/themes/hero";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal";
const blank: HeroSlide = { image: "", title: "", text: "", tag: "", cta: "Ver más", href: "/catalogo" };
const goodHref = (h: string) => h === "" || /^\/(?![/\\])\S*$/.test(h) || /^https:\/\/\S+$/.test(h);
const goodImage = (i: string) => /^https:\/\/\S+$/.test(i) || /^[a-zA-Z0-9]{1,30}$/.test(i);

// `custom`: el dueño eligió escribir la dirección a mano (solo en el panel, no se guarda).
type Draft = HeroSlide & { custom?: boolean };
type PhotoOption = { url: string; label: string };
type LinkOption = { href: string; label: string };

// Carrusel de la portada: banners propios (foto, textos, botón y enlace) y cada cuánto
// cambian. Sin banners propios, cada diseño muestra los suyos de ejemplo.
export function HeroForm({ initial, active, photos, links }: { initial: Partial<HeroConfig>; active: string; photos: PhotoOption[]; links: LinkOption[] }) {
  const design = defaultSlides[active] ?? defaultSlides.atelier;
  const [own, setOwn] = useState(Boolean(initial.slides?.length));
  const [slides, setSlides] = useState<Draft[]>(initial.slides?.length ? initial.slides : design);
  const [autoplay, setAutoplay] = useState(initial.autoplay ?? heroDefaults.autoplay);
  const [seconds, setSeconds] = useState(initial.seconds ?? heroDefaults.seconds);
  const [picking, setPicking] = useState<number | null>(null);
  const [preview, setPreview] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const touch = () => setMsg(null);
  const edit = (i: number, patch: Partial<Draft>) => {
    setSlides((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    touch();
  };
  const move = (i: number, d: -1 | 1) => {
    setSlides((cur) => {
      const next = [...cur];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
    setPreview(i + d);
    touch();
  };

  const list = own ? slides : design;
  const shown = list[Math.min(preview, list.length - 1)];

  const save = () =>
    start(async () => {
      const clean = slides.map((s) => ({ image: s.image.trim(), title: s.title.trim(), text: s.text.trim(), tag: s.tag.trim(), cta: s.cta.trim(), href: s.href.trim() }));
      if (own) {
        const bad = clean.findIndex((s) => !goodImage(s.image) || !s.title || !goodHref(s.href) || (s.cta && !s.href));
        if (!clean.length) return setMsg({ ok: false, text: "Agrega al menos un banner, o elige usar los del diseño." });
        if (bad >= 0) {
          const s = clean[bad];
          setPreview(bad);
          return setMsg({
            ok: false,
            text: `Banner ${bad + 1}: ${!goodImage(s.image) ? "falta la foto (una dirección que empiece con https://)" : !s.title ? "falta el título" : !goodHref(s.href) ? "el enlace debe empezar con / o https://" : "el botón necesita un enlace"}.`,
          });
        }
      }
      const res = await saveStore({ settings: { hero: { autoplay, seconds, slides: own ? clean : [] } } });
      if (res.ok && own) setSlides(clean);
      setMsg(res.ok ? { ok: true, text: "Guardado. La portada ya muestra el carrusel nuevo." } : { ok: false, text: res.error });
    });

  return (
    <div>
      <p className="text-sm text-zinc-500">Los banners grandes del inicio: foto, textos, botón y a dónde lleva. Para quitarlo entero, apaga «Portada» en la lista de secciones.</p>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">Movimiento</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={autoplay} onChange={(e) => { setAutoplay(e.target.checked); touch(); }} className="h-4 w-4 accent-zinc-900" />
          Pasar al siguiente banner solo
        </label>
        <label className={`flex items-center gap-2 ${autoplay ? "" : "opacity-40"}`}>
          cada
          <select value={seconds} disabled={!autoplay} onChange={(e) => { setSeconds(Number(e.target.value)); touch(); }} className="h-9 rounded-lg border border-zinc-300 bg-white px-2">
            {[3, 4, 5, 6, 8, 10, 12, 15].map((n) => <option key={n} value={n}>{n} segundos</option>)}
          </select>
        </label>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">Se detiene mientras el cliente tiene el mouse encima, y no se mueve para quien pidió menos animaciones en su equipo.</p>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">Banners</h3>
      <div className="mt-2 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="hero-mode" checked={!own} onChange={() => { setOwn(false); setPreview(0); touch(); }} className="h-4 w-4 accent-zinc-900" />
          Usar los banners de ejemplo del diseño
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="hero-mode" checked={own} onChange={() => { setOwn(true); setPreview(0); touch(); }} className="h-4 w-4 accent-zinc-900" />
          Usar mis propios banners
        </label>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          {!own && <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">El diseño trae {design.length} banners con fotos de muestra. Elige «Usar mis propios banners» para cambiarlos: parten de estos mismos para que solo reemplaces lo que quieras.</p>}
          {own &&
            slides.map((s, i) => (
              <fieldset key={i} onFocus={() => setPreview(i)} className={`flex flex-col gap-3 rounded-lg border p-3 ${preview === i ? "border-zinc-900" : "border-zinc-200"}`}>
                <legend className="sr-only">Banner {i + 1}</legend>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => { setPicking(picking === i ? null : i); setPreview(i); }} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 text-xs text-zinc-500" aria-label={`Cambiar la foto del banner ${i + 1}`}>
                    {s.image ? <img src={photoUrl(s.image)} alt="" className="h-full w-full object-cover" /> : "Sin foto"}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="mr-auto text-sm font-semibold">Banner {i + 1}</span>
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="h-9 w-9 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label={`Subir banner ${i + 1}`}>↑</button>
                      <button type="button" disabled={i === slides.length - 1} onClick={() => move(i, 1)} className="h-9 w-9 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label={`Bajar banner ${i + 1}`}>↓</button>
                      <button type="button" onClick={() => { setSlides((cur) => cur.filter((_, j) => j !== i)); setPreview(0); touch(); }} className="h-9 rounded-lg px-2 text-sm text-zinc-600 hover:bg-zinc-100" aria-label={`Quitar banner ${i + 1}`}>Quitar</button>
                    </div>
                    <input className={input} value={/^https?:/.test(s.image) ? s.image : ""} placeholder={s.image ? "Foto de muestra del diseño" : "https://… dirección de la foto"} onChange={(e) => edit(i, { image: e.target.value })} aria-label={`Foto del banner ${i + 1}`} maxLength={2000} />
                  </div>
                </div>
                {picking === i && (
                  <div className="rounded-lg bg-zinc-50 p-2">
                    <p className="mb-2 text-xs text-zinc-500">{photos.length ? "Elige una foto de tus productos o categorías, o pega arriba la dirección de otra." : "Pega arriba la dirección (https://…) de la foto. Las fotos de tus productos aparecerán aquí."}</p>
                    <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                      {photos.map((p) => (
                        <button key={p.url} type="button" title={p.label} onClick={() => { edit(i, { image: p.url }); setPicking(null); }} className={`aspect-square overflow-hidden rounded-md ring-2 ${s.image === p.url ? "ring-zinc-900" : "ring-transparent hover:ring-zinc-300"}`}>
                          <img src={p.url} alt={p.label} loading="lazy" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Título
                    <input className={input} value={s.title} maxLength={60} onChange={(e) => edit(i, { title: e.target.value })} placeholder="Colección Invierno" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Etiqueta <span className="text-xs font-normal text-zinc-500">opcional, va sobre el título</span>
                    <input className={input} value={s.tag} maxLength={30} onChange={(e) => edit(i, { tag: e.target.value })} placeholder="Edición limitada" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
                    Texto <span className="text-xs font-normal text-zinc-500">opcional</span>
                    <input className={input} value={s.text} maxLength={160} onChange={(e) => edit(i, { text: e.target.value })} placeholder="Lana, mezclilla y negro. Ya disponible." />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Texto del botón <span className="text-xs font-normal text-zinc-500">vacío = sin botón</span>
                    <input className={input} value={s.cta} maxLength={30} onChange={(e) => edit(i, { cta: e.target.value })} placeholder="Ver la colección" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    El botón lleva a
                    <select className={input} value={!s.custom && links.some((l) => l.href === s.href) ? s.href : "otro"} onChange={(e) => edit(i, e.target.value === "otro" ? { custom: true } : { href: e.target.value, custom: false })}>
                      {links.map((l) => <option key={l.href} value={l.href}>{l.label}</option>)}
                      <option value="otro">Otra dirección…</option>
                    </select>
                  </label>
                  {(s.custom || !links.some((l) => l.href === s.href)) && (
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Dirección
                        <input className={input} value={s.href} maxLength={300} onChange={(e) => edit(i, { href: e.target.value })} placeholder="/producto/poleron-zip-logo o https://instagram.com/tutienda" aria-invalid={!goodHref(s.href.trim())} />
                      </label>
                      {!goodHref(s.href.trim()) && <span className="text-xs text-red-700">Debe empezar con / (una página de tu tienda) o con https://</span>}
                    </div>
                  )}
                </div>
              </fieldset>
            ))}
          {own && slides.length < HERO_MAX && (
            <button type="button" onClick={() => { setSlides((cur) => [...cur, blank]); setPreview(slides.length); setPicking(slides.length); touch(); }} className="h-10 self-start rounded-lg border border-dashed border-zinc-300 px-4 text-sm hover:bg-zinc-50">
              + Agregar banner
            </button>
          )}
          {own && <p className="text-xs text-zinc-500">Hasta {HERO_MAX} banners. Usa fotos horizontales de al menos 1600 px de ancho; en celular se recortan por los lados.</p>}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Vista previa</p>
          {shown ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-800">
              {shown.image && <img src={photoUrl(shown.image)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6),transparent_70%)]" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-4 text-white">
                {shown.tag && <span className="bg-white/90 px-2 py-0.5 text-xs font-semibold uppercase text-black">{shown.tag}</span>}
                <p className="text-2xl font-semibold leading-tight">{shown.title || "Título del banner"}</p>
                {shown.text && <p className="text-sm">{shown.text}</p>}
                {shown.cta && <span className="mt-1 bg-white px-3 py-1.5 text-sm text-black">{shown.cta}</span>}
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Sin banners.</p>
          )}
          <div className="mt-2 flex gap-1.5" role="group" aria-label="Ver banner">
            {list.map((_, k) => (
              <button key={k} type="button" onClick={() => setPreview(k)} aria-label={`Ver banner ${k + 1}`} aria-pressed={k === preview} className={`h-2 rounded-full transition-all ${k === preview ? "w-8 bg-zinc-900" : "w-3 bg-zinc-300"}`} />
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Cada diseño lo muestra con su propio estilo. Mira el resultado en la tienda después de guardar.</p>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 flex items-center gap-4 border-t border-zinc-200 bg-white px-5 py-3">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar carrusel"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
