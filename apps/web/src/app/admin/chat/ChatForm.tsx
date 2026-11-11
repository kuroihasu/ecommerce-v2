"use client";

import { useState, useTransition } from "react";
import { saveStore } from "@/lib/admin/actions";
import { chatPlaceholders, defaultFaqs, fillAnswer, whatsappLink, type ChatConfig, type ChatFaq } from "@/designs/chat";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal";
const MAX = 12;

type Data = Parameters<typeof fillAnswer>[1] & { name: string };

export function ChatForm({ initial, data }: { initial: ChatConfig; data: Data }) {
  const [c, setC] = useState<ChatConfig>(initial);
  const [preview, setPreview] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<ChatConfig>) => {
    setC((cur) => ({ ...cur, ...patch }));
    setMsg(null);
  };
  const setFaq = (i: number, patch: Partial<ChatFaq>) => set({ faqs: c.faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const move = (i: number, d: -1 | 1) => {
    const faqs = [...c.faqs];
    [faqs[i], faqs[i + d]] = [faqs[i + d], faqs[i]];
    set({ faqs });
  };

  const wa = whatsappLink(c.whatsapp, `Hola ${data.name}, te escribo desde la tienda web.`);
  const shown = c.faqs[Math.min(preview, c.faqs.length - 1)];

  const save = () =>
    start(async () => {
      const faqs = c.faqs.map((f) => ({ ...f, question: f.question.trim(), answer: f.answer.trim() })).filter((f) => f.question || f.answer);
      if (faqs.some((f) => !f.question || !f.answer)) return setMsg({ ok: false, text: "Cada pregunta necesita su respuesta." });
      if (c.enabled && !wa) return setMsg({ ok: false, text: "Escribe tu número de WhatsApp para que el chat pueda pasarte a los clientes." });
      const res = await saveStore({ settings: { chat: { ...c, whatsapp: c.whatsapp.trim(), greeting: c.greeting.trim(), faqs } } });
      if (res.ok) set({ faqs });
      setMsg(res.ok ? { ok: true, text: c.enabled ? "Guardado. El chat ya aparece en la tienda." : "Guardado. El chat está apagado." } : { ok: false, text: res.error });
    });

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold">Mostrar el chat en la tienda</span>
          <span className="text-sm text-zinc-500">Un botón verde en la esquina inferior derecha de todas las páginas.</span>
        </span>
        <span className="relative mt-1 inline-flex shrink-0">
          <input type="checkbox" role="switch" className="peer sr-only" checked={c.enabled} onChange={(e) => set({ enabled: e.target.checked })} aria-label="Mostrar el chat en la tienda" />
          <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2" />
          <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Tu WhatsApp
              <input className={input} value={c.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="+56 9 1234 5678" inputMode="tel" maxLength={20} />
              <span className="text-xs font-normal text-zinc-500">
                Aquí llegan los clientes que necesitan hablar con alguien.{" "}
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="underline">Probar el enlace</a>}
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Saludo
              <input className={input} value={c.greeting} onChange={(e) => set({ greeting: e.target.value })} maxLength={200} />
            </label>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Preguntas y respuestas</h3>
            <p className="mt-1 text-sm text-zinc-500">
              El cliente las ve como botones, o escribe su duda y el chat busca la respuesta más parecida. Si no encuentra ninguna, le ofrece hablar contigo por WhatsApp.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {c.faqs.map((f, i) => (
                <div key={i} className={`flex flex-col gap-2 rounded-lg border p-3 ${preview === i ? "border-zinc-900" : "border-zinc-200"}`} onFocus={() => setPreview(i)}>
                  <div className="flex gap-2">
                    <input className={input} value={f.question} maxLength={80} onChange={(e) => setFaq(i, { question: e.target.value })} aria-label={`Pregunta ${i + 1}`} placeholder="¿Hacen envíos a regiones?" />
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="h-10 w-9 shrink-0 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label={`Subir pregunta ${i + 1}`}>↑</button>
                    <button type="button" disabled={i === c.faqs.length - 1} onClick={() => move(i, 1)} className="h-10 w-9 shrink-0 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label={`Bajar pregunta ${i + 1}`}>↓</button>
                    <button type="button" onClick={() => set({ faqs: c.faqs.filter((_, j) => j !== i) })} className="h-10 shrink-0 rounded-lg px-2 text-sm text-zinc-600 hover:bg-zinc-100" aria-label={`Quitar pregunta ${i + 1}`}>Quitar</button>
                  </div>
                  <textarea className={`${input} h-auto min-h-20 py-2`} value={f.answer} maxLength={600} onChange={(e) => setFaq(i, { answer: e.target.value })} aria-label={`Respuesta ${i + 1}`} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={f.handoff} onChange={(e) => setFaq(i, { handoff: e.target.checked })} className="h-4 w-4 accent-zinc-900" />
                    Después de responder, ofrecer hablar con una persona
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.faqs.length < MAX && (
                <button type="button" onClick={() => { set({ faqs: [...c.faqs, { question: "", answer: "", handoff: false }] }); setPreview(c.faqs.length); }} className="h-10 rounded-lg border border-dashed border-zinc-300 px-4 text-sm hover:bg-zinc-50">
                  + Agregar pregunta
                </button>
              )}
              {c.faqs.length === 0 && (
                <button type="button" onClick={() => set({ faqs: defaultFaqs })} className="h-10 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50">Usar las preguntas de ejemplo</button>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm">
              <p className="font-medium">Datos que se completan solos en las respuestas</p>
              <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                {chatPlaceholders.map((p) => (
                  <li key={p.key}>
                    <code className="rounded bg-white px-1.5 py-0.5 ring-1 ring-zinc-200">{p.key}</code> <span className="text-zinc-600">{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Vista previa</p>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 font-semibold">{data.name.charAt(0)}</span>
              <span className="font-semibold">{data.name}</span>
            </div>
            <div className="flex min-h-64 flex-col gap-2 bg-[#ECE5DD] p-3 text-[15px]">
              <p className="max-w-[85%] rounded-xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">{c.greeting || "¡Hola!"}</p>
              {shown && (
                <>
                  <p className="max-w-[85%] self-end rounded-xl rounded-br-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">{shown.question || "…"}</p>
                  <p className="max-w-[85%] whitespace-pre-line rounded-xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">{fillAnswer(shown.answer || "…", data)}</p>
                  {shown.handoff && <span className="self-start rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white">Hablar con una persona</span>}
                </>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Haz clic en una pregunta para verla aquí.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={save} disabled={pending} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
