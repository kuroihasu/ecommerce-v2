"use client";

import { useEffect, useRef, useState } from "react";
import { useCatalogData } from "./CatalogProvider";
import { bestFaq, fillAnswer, whatsappLink, type ChatConfig } from "./chat";

// Botón de chat de la tienda. Responde solo las preguntas frecuentes que el dueño
// dejó en el panel; si el cliente necesita más, lo pasa a WhatsApp con su pregunta
// ya escrita en el mensaje.

type Msg = { from: "bot" | "me"; text: string; handoff?: boolean };

function Bubble({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z" />
    </svg>
  );
}

export function ChatWidget({ chat }: { chat: ChatConfig }) {
  const { store } = useCatalogData();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: chat.greeting || "¡Hola! ¿En qué te ayudamos?" }]);
  const [asked, setAsked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const last = asked[asked.length - 1];
  const wa = whatsappLink(chat.whatsapp || store.whatsapp, `Hola ${store.name}, te escribo desde la tienda web.${last ? `\nMi pregunta: ${last}` : ""}`);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reply = (question: string, i: number) => {
    setMsgs((m) => [...m, { from: "me", text: question }]);
    setAsked((a) => [...a, question]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [
        ...m,
        i >= 0
          ? { from: "bot", text: fillAnswer(chat.faqs[i].answer, store), handoff: chat.faqs[i].handoff }
          : { from: "bot", text: `No tengo esa respuesta guardada, pero alguien de ${store.name} te puede ayudar.`, handoff: true },
      ]);
    }, 450);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim().slice(0, 300);
    if (!q) return;
    setText("");
    reply(q, bestFaq(chat.faqs, q));
  };

  const pending = chat.faqs.map((f, i) => ({ f, i })).filter(({ f }) => !asked.includes(f.question));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Cerrar el chat" : "Abrir el chat de ayuda"}
        className="fixed right-4 bottom-4 z-[56] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <span className="text-3xl leading-none">×</span> : <Bubble className="h-7 w-7" />}
      </button>

      {open && (
        <section
          aria-label="Chat de ayuda"
          className="rise fixed right-4 bottom-20 z-[56] flex h-[min(560px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white text-[#111] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
        >
          <header className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 font-semibold">{store.name.charAt(0)}</span>
            <div className="flex flex-col">
              <span className="font-semibold leading-tight">{store.name}</span>
              <span className="text-xs text-white/80">Respuestas al instante</span>
            </div>
          </header>

          <div ref={list} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#ECE5DD] p-3" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 ${m.from === "me" ? "items-end" : "items-start"}`}>
                <p className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-[15px] leading-snug shadow-sm ${m.from === "me" ? "rounded-br-sm bg-[#DCF8C6]" : "rounded-bl-sm bg-white"}`}>{m.text}</p>
                {m.handoff && wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white shadow-sm">
                    <Bubble className="h-4 w-4" /> Hablar con una persona
                  </a>
                )}
                {m.handoff && !wa && store.email && <p className="text-sm">Escríbenos a <a href={`mailto:${store.email}`} className="underline">{store.email}</a>.</p>}
              </div>
            ))}
            {typing && <p className="w-14 rounded-xl rounded-bl-sm bg-white px-3 py-2 text-center tracking-widest text-zinc-500 shadow-sm">···</p>}
            {!typing && pending.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {pending.map(({ f, i }) => (
                  <button key={i} type="button" onClick={() => reply(f.question, i)} className="rounded-full border border-[#075E54]/30 bg-white px-3 py-1.5 text-left text-sm text-[#075E54] hover:bg-[#f4fbf7]">
                    {f.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-2">
            <label htmlFor="chat-q" className="sr-only">Escribe tu pregunta</label>
            <input ref={input} id="chat-q" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Escribe tu pregunta" className="h-11 min-w-0 flex-1 rounded-full bg-zinc-100 px-4 text-[15px]" />
            <button className="h-11 rounded-full bg-[#075E54] px-4 text-sm font-medium text-white">Enviar</button>
          </form>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="border-t border-zinc-100 py-2 text-center text-xs text-zinc-500 hover:text-zinc-800">
              ¿Prefieres hablar con una persona? Abrir WhatsApp
            </a>
          )}
        </section>
      )}
    </>
  );
}
