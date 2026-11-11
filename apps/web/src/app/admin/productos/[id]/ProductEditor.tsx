"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { archiveProduct, saveProduct } from "@/lib/admin/actions";
import type { AdminCategory, AdminImage, AdminProduct, AdminVariant, ProductColor } from "@/lib/admin/types";

const BADGES = [
  { value: "", label: "Ninguna" },
  { value: "nuevo", label: "Nuevo" },
  { value: "preventa", label: "Preventa" },
  { value: "ultimas", label: "Últimas unidades" },
];
const LINES = [
  { value: "", label: "Todos (unisex)" },
  { value: "mujer", label: "Mujer" },
  { value: "hombre", label: "Hombre" },
];
const SPECIAL = new Set(["nuevo", "preventa", "ultimas", "mujer", "hombre"]);

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3";
const small = "h-9 rounded-lg border border-zinc-300 bg-white px-2";
const btn = "h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-100";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-4 text-sm text-zinc-500">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${className}`}>
      {label}
      <span className="font-normal">{children}</span>
    </label>
  );
}

const move = <T,>(list: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export function ProductEditor({ initial, categories }: { initial: AdminProduct; categories: AdminCategory[] }) {
  const [p, setP] = useState(initial);
  const [images, setImages] = useState<AdminImage[]>(initial.images);
  const [variants, setVariants] = useState<AdminVariant[]>(initial.variants);
  const [newUrl, setNewUrl] = useState("");
  const [sizesText, setSizesText] = useState(() =>
    [...new Set(initial.variants.map((v) => v.options.Talla).filter(Boolean))].join(", "),
  );
  const [bulkPrice, setBulkPrice] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  const colors = p.attributes.colors ?? [];
  const badge = p.tags.find((t) => t === "nuevo" || t === "preventa" || t === "ultimas") ?? "";
  const line = p.tags.find((t) => t === "mujer" || t === "hombre") ?? "";
  const otherTags = p.tags.filter((t) => !SPECIAL.has(t));

  const edit = (patch: Partial<AdminProduct>) => {
    setP((cur) => ({ ...cur, ...patch }));
    setDirty(true);
  };
  const setAttr = (patch: Partial<AdminProduct["attributes"]>) => edit({ attributes: { ...p.attributes, ...patch } });
  const setTags = (b: string, l: string) => edit({ tags: [...otherTags, ...(l ? [l] : []), ...(b ? [b] : [])] });
  const editImages = (next: AdminImage[]) => {
    setImages(next);
    setDirty(true);
  };
  const editVariants = (next: AdminVariant[]) => {
    setVariants(next);
    setDirty(true);
  };
  const setColors = (next: ProductColor[]) => setAttr({ colors: next });

  // Crea una variante por cada color × talla, conservando precio, stock y SKU de las que ya existían.
  const generate = () => {
    const sizes = sizesText.split(",").map((s) => s.trim()).filter(Boolean);
    const cs = colors.length ? colors.map((c) => c.name) : [""];
    const ss = sizes.length ? sizes : [""];
    const base = variants[0] ?? { price: 0, compareAtPrice: null, stock: 0, sku: null };
    const next: AdminVariant[] = cs.flatMap((c) =>
      ss.map((s) => {
        const found = variants.find((v) => (v.options.Color ?? "") === c && (v.options.Talla ?? "") === s);
        const options: Record<string, string> = { ...(c ? { Color: c } : {}), ...(s ? { Talla: s } : {}) };
        const name = [c, s].filter(Boolean).join(" / ") || "Default";
        return found
          ? { ...found, name, options }
          : { name, options, price: base.price, compareAtPrice: base.compareAtPrice, stock: 0, sku: null };
      }),
    );
    editVariants(next);
  };

  const save = () =>
    start(async () => {
      setMsg(null);
      const res = await saveProduct(p.id, {
        product: {
          name: p.name,
          slug: p.slug,
          description: p.description || null,
          status: p.status,
          featured: p.featured,
          categoryId: p.categoryId,
          tags: p.tags,
          attributes: {
            short: p.attributes.short ?? "",
            details: (p.attributes.details ?? []).filter((d) => d.trim()),
            colors,
          },
        },
        images: images.map(({ id, url, alt, color }) => ({ id, url, alt: alt || null, color: color || null })),
        variants: variants.map((v) => ({ ...v, sku: v.sku || null })),
      });
      if (res.ok) {
        setP(res.data);
        setImages(res.data.images);
        setVariants(res.data.variants);
        setDirty(false);
        setMsg({ ok: true, text: res.data.status === "ACTIVE" ? "Guardado. Ya se ve en la tienda." : "Guardado." });
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });

  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/productos" className="text-sm text-zinc-500 hover:text-zinc-900">← Productos</Link>
          <h1 className="truncate text-2xl font-semibold">{p.name || "Producto sin nombre"}</h1>
        </div>
        {initial.status === "ACTIVE" && (
          <Link href={`/producto/${initial.slug}`} target="_blank" className={btn + " grid place-items-center"}>Ver en la tienda ↗</Link>
        )}
      </div>

      <Section title="Información">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre">
            <input className={input} value={p.name} onChange={(e) => edit({ name: e.target.value })} maxLength={120} />
          </Field>
          <Field label="Dirección en la tienda">
            <span className="flex items-center rounded-lg border border-zinc-300 bg-white pl-3 text-zinc-500">
              /producto/
              <input className="h-10 min-w-0 flex-1 rounded-r-lg px-1 text-zinc-900 outline-none" value={p.slug} onChange={(e) => edit({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} maxLength={120} aria-label="Dirección" />
            </span>
          </Field>
          <Field label="Descripción" className="md:col-span-2">
            <textarea className={input + " h-28 py-2"} value={p.description ?? ""} onChange={(e) => edit({ description: e.target.value })} maxLength={5000} />
          </Field>
          <Field label="Categoría">
            <select className={input} value={p.categoryId ?? ""} onChange={(e) => edit({ categoryId: e.target.value || null })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={input} value={p.status} onChange={(e) => edit({ status: e.target.value as AdminProduct["status"] })}>
              <option value="DRAFT">Borrador (no se ve en la tienda)</option>
              <option value="ACTIVE">Publicado</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </Field>
          <Field label="Etiqueta">
            <select className={input} value={badge} onChange={(e) => setTags(e.target.value, line)}>
              {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </Field>
          <Field label="Para">
            <select className={input} value={line} onChange={(e) => setTags(badge, e.target.value)}>
              {LINES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={p.featured} onChange={(e) => edit({ featured: e.target.checked })} />
            Destacado en la portada
          </label>
        </div>
      </Section>

      <Section title="Ficha" hint="Lo que aparece bajo el nombre y en la lista de detalles.">
        <div className="grid gap-4">
          <Field label="Bajada corta">
            <input className={input} value={p.attributes.short ?? ""} onChange={(e) => setAttr({ short: e.target.value })} maxLength={160} placeholder="Ej: Algodón perchado 380 g" />
          </Field>
          <Field label="Detalles (uno por línea)">
            <textarea className={input + " h-28 py-2"} value={(p.attributes.details ?? []).join("\n")} onChange={(e) => setAttr({ details: e.target.value.split("\n") })} placeholder={"80% algodón\nHecho en Santiago"} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Colores</span>
            {colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={c.hex} onChange={(e) => setColors(colors.map((x, k) => (k === i ? { ...x, hex: e.target.value } : x)))} className="h-9 w-12 rounded border border-zinc-300" aria-label={`Tono de ${c.name}`} />
                <input className={small + " flex-1"} value={c.name} onChange={(e) => setColors(colors.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} aria-label="Nombre del color" />
                <button type="button" className={btn} onClick={() => setColors(colors.filter((_, k) => k !== i))}>Quitar</button>
              </div>
            ))}
            <button type="button" className={btn + " self-start"} onClick={() => setColors([...colors, { name: `Color ${colors.length + 1}`, hex: "#999999" }])}>+ Agregar color</button>
          </div>
        </div>
      </Section>

      <Section title="Fotos" hint="La primera es la principal y la segunda aparece al pasar el mouse. Asigna un color para que se muestre al elegir ese color.">
        <ul className="flex flex-col gap-2">
          {images.map((img, i) => (
            <li key={img.id ?? `${img.url}-${i}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la URL tal cual */}
              <img src={img.url} alt="" className="size-16 rounded-md bg-zinc-100 object-cover" />
              <input className={small + " min-w-0 flex-1"} value={img.url} onChange={(e) => editImages(images.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} aria-label="URL de la foto" />
              <select className={small} value={img.color ?? ""} onChange={(e) => editImages(images.map((x, k) => (k === i ? { ...x, color: e.target.value || null } : x)))} aria-label="Color de la foto">
                <option value="">Todos los colores</option>
                {colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <button type="button" className={btn} onClick={() => editImages(move(images, i, -1))} aria-label="Subir">↑</button>
              <button type="button" className={btn} onClick={() => editImages(move(images, i, 1))} aria-label="Bajar">↓</button>
              <button type="button" className={btn} onClick={() => editImages(images.filter((_, k) => k !== i))}>Quitar</button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input className={small + " flex-1"} value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://… (pega la dirección de la foto)" aria-label="Nueva foto" />
          <button
            type="button"
            className={btn}
            onClick={() => {
              if (!/^https:\/\//.test(newUrl.trim())) return setMsg({ ok: false, text: "La foto debe ser una dirección que empiece con https://" });
              editImages([...images, { url: newUrl.trim(), alt: null, color: null }]);
              setNewUrl("");
            }}
          >
            Agregar foto
          </button>
        </div>
      </Section>

      <Section title={`Variantes, precios y stock (${totalStock} unidades)`} hint="Escribe las tallas separadas por coma y genera una variante por cada color y talla.">
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <Field label="Tallas">
            <input className={small + " w-64"} value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="S, M, L, XL" />
          </Field>
          <button type="button" className={btn} onClick={generate}>Generar combinaciones</button>
          <span className="mx-2 hidden h-9 w-px bg-zinc-200 sm:block" />
          <Field label="Precio para todas">
            <input className={small + " w-32"} inputMode="numeric" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value.replace(/\D/g, ""))} placeholder="19990" />
          </Field>
          <button type="button" className={btn} disabled={!bulkPrice} onClick={() => editVariants(variants.map((v) => ({ ...v, price: Number(bulkPrice) })))}>Aplicar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2 font-medium">Variante</th>
                <th className="py-2 font-medium">Precio</th>
                <th className="py-2 font-medium">Precio antes (oferta)</th>
                <th className="py-2 font-medium">Stock</th>
                <th className="py-2 font-medium">Costo</th>
                <th className="py-2 font-medium">SKU</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => {
                const set = (patch: Partial<AdminVariant>) => editVariants(variants.map((x, k) => (k === i ? { ...x, ...patch } : x)));
                const num = (s: string) => Number(s.replace(/\D/g, "") || 0);
                return (
                  <tr key={v.id ?? `nueva-${i}`} className="border-t border-zinc-100">
                    <td className="py-2 pr-2"><input className={small + " w-40"} value={v.name} onChange={(e) => set({ name: e.target.value })} aria-label="Nombre de la variante" /></td>
                    <td className="py-2 pr-2"><input className={small + " w-28"} inputMode="numeric" value={v.price} onChange={(e) => set({ price: num(e.target.value) })} aria-label={`Precio de ${v.name}`} /></td>
                    <td className="py-2 pr-2"><input className={small + " w-28"} inputMode="numeric" value={v.compareAtPrice ?? ""} onChange={(e) => set({ compareAtPrice: e.target.value ? num(e.target.value) : null })} placeholder="—" aria-label={`Precio antes de ${v.name}`} /></td>
                    <td className="py-2 pr-2"><input className={small + ` w-20 ${v.stock === 0 ? "text-red-600" : ""}`} inputMode="numeric" value={v.stock} onChange={(e) => set({ stock: num(e.target.value) })} aria-label={`Stock de ${v.name}`} /></td>
                    <td className="py-2 pr-2"><input className={small + " w-24"} inputMode="numeric" value={v.cost ?? ""} onChange={(e) => set({ cost: e.target.value ? num(e.target.value) : null })} placeholder="—" aria-label={`Costo de ${v.name}`} /></td>
                    <td className="py-2 pr-2"><input className={small + " w-36"} value={v.sku ?? ""} onChange={(e) => set({ sku: e.target.value })} aria-label={`SKU de ${v.name}`} /></td>
                    <td className="py-2 text-right">
                      <button type="button" className={btn} disabled={variants.length === 1} onClick={() => editVariants(variants.filter((_, k) => k !== i))}>Quitar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="flex justify-end">
        <form action={archiveProduct.bind(null, p.id)} onSubmit={(e) => { if (!confirm("¿Archivar este producto? Deja de verse en la tienda, pero los pedidos que lo incluyen se mantienen.")) e.preventDefault(); }}>
          <button className="text-sm text-red-700 hover:underline">Archivar producto</button>
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-3 md:px-8">
          {msg ? (
            <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>
          ) : dirty ? (
            <p className="text-sm text-zinc-500">Hay cambios sin guardar</p>
          ) : null}
          <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
