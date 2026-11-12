"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listChats, openChat, replyChat, resetTest, saveWhatsapp, sendTest, setChatStatus, type WhatsappPayload } from "@/lib/admin/whatsapp-actions";
import type { WaConversation, WaMessage, WaStatus, WaTestChat, WaThread, WhatsappConfig } from "@/lib/admin/types";
import { useTwoFactor } from "../StepUp";

const input = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal";
type Tab = "chats" | "test" | "config";
type Msg = { ok: boolean; text: string } | null;

const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 · el más capaz (recomendado)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 · más económico" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 · el más económico y rápido" },
];

const STATUS: Record<WaStatus, { label: string; className: string }> = {
  BOT: { label: "Asistente", className: "bg-emerald-100 text-emerald-800" },
  HUMAN: { label: "Necesita persona", className: "bg-amber-100 text-amber-900" },
  CLOSED: { label: "Cerrada", className: "bg-zinc-200 text-zinc-700" },
};

const time = (iso: string) => new Date(iso).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const phone = (waId: string) => (waId.startsWith("56") && waId.length === 11 ? `+56 ${waId.slice(2, 3)} ${waId.slice(3, 7)} ${waId.slice(7)}` : `+${waId}`);

export function WhatsappPanel({ config, chats, test, webhookUrl }: { config: WhatsappConfig; chats: WaConversation[]; test: WaTestChat; webhookUrl: string }) {
  const [cfg, setCfg] = useState(config);
  const ready = cfg.enabled && cfg.hasAccessToken;
  const [tab, setTab] = useState<Tab>(ready ? "chats" : cfg.hasAiKey || cfg.aiKeyFromEnv ? "test" : "config");
  const pending = chats.filter((c) => c.status === "HUMAN").length;

  return (
    <div className="flex flex-col gap-4">
      <StatusBanner cfg={cfg} />
      <div role="tablist" className="flex gap-1 border-b border-zinc-200">
        {(
          [
            ["chats", `Conversaciones${pending ? ` (${pending})` : ""}`],
            ["test", "Probar"],
            ["config", "Configurar"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[15px] font-medium ${tab === t ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "chats" && <Conversations initial={chats} />}
      {tab === "test" && <TestChat initial={test} canRun={cfg.hasAiKey || cfg.aiKeyFromEnv} onConfigure={() => setTab("config")} />}
      {tab === "config" && <ConfigForm cfg={cfg} onSaved={setCfg} webhookUrl={webhookUrl} />}
    </div>
  );
}

function StatusBanner({ cfg }: { cfg: WhatsappConfig }) {
  const [tone, text] = !cfg.enabled
    ? ["bg-zinc-100 text-zinc-700", "Apagado. Los mensajes que lleguen igual se guardan en Conversaciones (si el número ya está conectado)."]
    : !cfg.live
      ? ["bg-amber-50 text-amber-900", `Modo prueba: solo responde a ${cfg.testNumbers.map(phone).join(", ")}. Los demás clientes no reciben respuesta del asistente.`]
      : ["bg-emerald-50 text-emerald-900", `Atendiendo a todos los clientes${cfg.displayPhone ? ` en ${cfg.displayPhone}` : ""}.`];
  return <p className={`rounded-lg px-4 py-3 text-sm ${tone}`}>{text}</p>;
}

// ─── Conversaciones ───────────────────────────────────────────────────

function Conversations({ initial }: { initial: WaConversation[] }) {
  const [chats, setChats] = useState(initial);
  const [filter, setFilter] = useState<WaStatus | "">("");
  const [thread, setThread] = useState<WaThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  // Se actualiza solo cada 15 segundos mientras la página está abierta.
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      const r = await listChats(filter || undefined);
      if (r.ok) setChats(r.data);
      if (thread) {
        const t = await openChat(thread.id);
        if (t.ok && t.data.messages.length !== thread.messages.length) setThread(t.data);
      }
    };
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [filter, thread]);

  useEffect(() => {
    void endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  const changeFilter = (f: WaStatus | "") =>
    start(async () => {
      setFilter(f);
      const r = await listChats(f || undefined);
      if (r.ok) setChats(r.data);
    });

  const open = (id: string) =>
    start(async () => {
      setError(null);
      const r = await openChat(id);
      if (r.ok) {
        setThread(r.data);
        setChats((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      } else setError(r.error);
    });

  const apply = (r: Awaited<ReturnType<typeof openChat>>) => {
    if (!r.ok) return setError(r.error);
    setError(null);
    setThread(r.data);
    setChats((cs) => cs.map((c) => (c.id === r.data.id ? { ...c, status: r.data.status, handoffReason: r.data.handoffReason, last: r.data.messages.at(-1) ?? c.last } : c)));
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread || !text.trim()) return;
    start(async () => {
      const r = await replyChat(thread.id, text.trim());
      apply(r);
      if (r.ok) setText("");
    });
  };

  const status = (s: WaStatus) => thread && start(async () => apply(await setChatStatus(thread.id, s)));

  return (
    <div className="grid min-h-[480px] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-xl border border-zinc-200 bg-white md:grid-cols-[320px_minmax(0,1fr)]">
      <div className={`flex flex-col border-zinc-200 md:border-r ${thread ? "hidden md:flex" : "flex"}`}>
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 p-2 text-sm">
          {(
            [
              ["", "Todas"],
              ["HUMAN", "Necesitan persona"],
              ["BOT", "Asistente"],
              ["CLOSED", "Cerradas"],
            ] as [WaStatus | "", string][]
          ).map(([f, label]) => (
            <button key={f} onClick={() => changeFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${filter === f ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>
              {label}
            </button>
          ))}
        </div>
        {chats.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Aún no hay conversaciones. Cuando un cliente escriba al WhatsApp de la tienda, aparecerá aquí.</p>
        ) : (
          <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto">
            {chats.map((c) => (
              <li key={c.id}>
                <button onClick={() => open(c.id)} className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-zinc-50 ${thread?.id === c.id ? "bg-zinc-50" : ""}`}>
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name || phone(c.waId)}</span>
                    {c.unread > 0 && <span className="rounded-full bg-emerald-600 px-2 text-xs font-semibold text-white">{c.unread}</span>}
                    <span className="text-xs text-zinc-500">{time(c.lastMessageAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS[c.status].className}`}>{STATUS[c.status].label}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">{c.last ? `${c.last.author === "CUSTOMER" ? "" : c.last.author === "BOT" ? "Asistente: " : "Tú: "}${c.last.text}` : ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`flex min-w-0 flex-col ${thread ? "flex" : "hidden md:flex"}`}>
        {!thread ? (
          <p className="m-auto p-6 text-sm text-zinc-500">Elige una conversación para leerla o responder.</p>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
              <button onClick={() => setThread(null)} className="mr-1 text-sm text-zinc-600 underline md:hidden">← Volver</button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{thread.name || phone(thread.waId)}</p>
                <p className="text-xs text-zinc-500">{phone(thread.waId)}</p>
              </div>
              {thread.status !== "BOT" && <button disabled={busy} onClick={() => status("BOT")} className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50">Devolver al asistente</button>}
              {thread.status === "BOT" && <button disabled={busy} onClick={() => status("HUMAN")} className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50">Tomar conversación</button>}
              {thread.status !== "CLOSED" && <button disabled={busy} onClick={() => status("CLOSED")} className="h-9 rounded-lg px-3 text-sm text-zinc-600 underline">Cerrar</button>}
            </header>
            {thread.status === "HUMAN" && thread.handoffReason && <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-900">⚠ {thread.handoffReason} El asistente no responde hasta que la devuelvas.</p>}
            <Bubbles messages={thread.messages} />
            <div ref={endRef} />
            {error && <p role="alert" className="px-4 pb-2 text-sm text-red-700">{error}</p>}
            {thread.canReply ? (
              <form onSubmit={send} className="flex gap-2 border-t border-zinc-100 p-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(e))}
                  rows={1}
                  maxLength={4000}
                  placeholder="Responder como la tienda (el asistente se pausa aquí)"
                  className="min-h-10 flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-[15px]"
                />
                <button disabled={busy || !text.trim()} className="h-10 rounded-lg bg-zinc-900 px-5 font-medium text-white disabled:opacity-50">Enviar</button>
              </form>
            ) : (
              <p className="border-t border-zinc-100 p-3 text-sm text-zinc-500">Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp no deja escribirle sin una plantilla aprobada. Respóndele desde la app de WhatsApp Business cuando vuelva a escribir.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Bubbles({ messages }: { messages: WaMessage[] }) {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#efeae2] p-4">
      {messages.map((m) => (
        <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-[15px] shadow-sm ${m.author === "CUSTOMER" ? "self-start bg-white" : "self-end bg-[#d9fdd3]"}`}>
          {m.author !== "CUSTOMER" && <p className="mb-0.5 text-[11px] font-semibold text-emerald-800">{m.author === "BOT" ? "Asistente" : "Equipo"}</p>}
          <p className="whitespace-pre-wrap break-words">{m.text}</p>
          <p className="mt-0.5 text-right text-[11px] text-zinc-500">{time(m.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Probar ───────────────────────────────────────────────────────────

function TestChat({ initial, canRun, onConfigure }: { initial: WaTestChat; canRun: boolean; onConfigure: () => void }) {
  const [chat, setChat] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const examples = ["Hola, ¿tienen polerones negros en talla M?", "¿Cuánto cuesta el envío a Concepción?", "Quiero saber de mi pedido", "Quiero cambiar una prenda"];

  const send = (t: string) => {
    if (!t.trim()) return;
    setText("");
    setChat((c) => ({ ...c, messages: [...c.messages, { id: `tmp-${Date.now()}`, author: "CUSTOMER", text: t, createdAt: new Date().toISOString() }] }));
    start(async () => {
      const r = await sendTest(t);
      if (r.ok) {
        setChat(r.data);
        setError(null);
      } else setError(r.error);
    });
  };

  if (!canRun) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="mb-4 text-zinc-600">Para probar el asistente primero pega la API key de Claude en Configurar. No hace falta tener WhatsApp conectado para probar.</p>
        <button onClick={onConfigure} className="h-10 rounded-lg bg-zinc-900 px-5 font-medium text-white">Ir a Configurar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <p className="flex-1 text-sm text-zinc-600">Escribe como si fueras un cliente. Usa el catálogo, los pedidos y las preguntas frecuentes reales, pero nada sale por WhatsApp.</p>
        <button disabled={busy} onClick={() => start(async () => { const r = await resetTest(); if (r.ok) setChat(r.data); })} className="h-9 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50">
          Empezar de nuevo
        </button>
      </header>
      {chat.messages.length === 0 ? (
        <div className="flex flex-wrap gap-2 bg-[#efeae2] p-4">
          {examples.map((e) => (
            <button key={e} onClick={() => send(e)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-zinc-50">{e}</button>
          ))}
        </div>
      ) : (
        <div className="max-h-[520px] min-h-[320px] overflow-y-auto"><Bubbles messages={chat.messages} /></div>
      )}
      {busy && <p className="px-4 py-2 text-sm text-zinc-500">El asistente está escribiendo…</p>}
      {chat.handoff && <p className="bg-amber-50 px-4 py-2 text-sm text-amber-900">En WhatsApp esta conversación pasaría a una persona: {chat.handoff}</p>}
      {error && <p role="alert" className="px-4 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={(e) => (e.preventDefault(), send(text))} className="flex gap-2 border-t border-zinc-100 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Escribe un mensaje" className={input} />
        <button disabled={busy || !text.trim()} className="h-10 rounded-lg bg-zinc-900 px-5 font-medium text-white disabled:opacity-50">Enviar</button>
      </form>
    </div>
  );
}

// ─── Configurar ───────────────────────────────────────────────────────

function ConfigForm({ cfg, onSaved, webhookUrl }: { cfg: WhatsappConfig; onSaved: (c: WhatsappConfig) => void; webhookUrl: string }) {
  const [f, setF] = useState({
    enabled: cfg.enabled,
    live: cfg.live,
    testNumbers: cfg.testNumbers.join(", "),
    phoneNumberId: cfg.phoneNumberId,
    displayPhone: cfg.displayPhone,
    model: cfg.model,
    instructions: cfg.instructions,
    accessToken: "",
    appSecret: "",
    aiKey: "",
  });
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, start] = useTransition();
  const withTwoFactor = useTwoFactor();

  const save = () =>
    start(async () => {
      const body: WhatsappPayload = {
        enabled: f.enabled,
        live: f.live,
        testNumbers: f.testNumbers.split(/[,;\n]/).map((n) => n.trim()).filter(Boolean),
        phoneNumberId: f.phoneNumberId.trim(),
        displayPhone: f.displayPhone.trim(),
        model: f.model,
        instructions: f.instructions,
        ...(f.accessToken ? { accessToken: f.accessToken } : {}),
        ...(f.appSecret ? { appSecret: f.appSecret } : {}),
        ...(f.aiKey ? { aiKey: f.aiKey } : {}),
      };
      const r = await withTwoFactor(() => saveWhatsapp(body));
      if (r.ok) {
        onSaved(r.data);
        setF((x) => ({ ...x, accessToken: "", appSecret: "", aiKey: "" }));
      }
      setMsg(r.ok ? { ok: true, text: "Guardado." } : { ok: false, text: r.error });
    });

  const copy = (t: string) => void navigator.clipboard?.writeText(t);

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} className="mt-0.5 h-5 w-5 accent-zinc-900" />
        <span>
          <span className="block text-[15px] font-medium">Asistente encendido</span>
          <span className="text-zinc-500">Responde los mensajes que llegan al WhatsApp de la tienda.</span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-medium">¿A quién responde?</legend>
        <label className="flex items-start gap-2">
          <input type="radio" name="wa-mode" checked={!f.live} onChange={() => setF({ ...f, live: false })} className="mt-0.5 h-4 w-4 accent-zinc-900" />
          <span>Modo prueba: solo a estos números (los demás mensajes se guardan, pero no se responden).</span>
        </label>
        {!f.live && <input className={input} value={f.testNumbers} onChange={(e) => setF({ ...f, testNumbers: e.target.value })} placeholder="+56 9 1234 5678, +56 9 8765 4321" />}
        <label className="flex items-start gap-2">
          <input type="radio" name="wa-mode" checked={f.live} onChange={() => setF({ ...f, live: true })} className="mt-0.5 h-4 w-4 accent-zinc-900" />
          <span>A todos los clientes.</span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-3">
        <h3 className="text-[15px] font-medium">1. Inteligencia artificial (Claude)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-medium">
            API key de Claude
            <input className={input} type="password" autoComplete="off" value={f.aiKey} onChange={(e) => setF({ ...f, aiKey: e.target.value.trim() })} placeholder={cfg.hasAiKey ? "Guardada · pega otra para cambiarla" : cfg.aiKeyFromEnv ? "Usando la del servidor · opcional" : "sk-ant-…"} />
          </label>
          <label className="flex flex-col gap-1.5 font-medium">
            Modelo
            <select className={input} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>
        <p className="text-zinc-500">
          Créala en platform.claude.com → API keys (se cobra por uso a la cuenta de la tienda). Opus responde mejor las preguntas difíciles; Haiku cuesta mucho menos por mensaje. Cada cliente tiene un tope de 30 respuestas por hora.
        </p>
        <label className="flex flex-col gap-1.5 font-medium">
          Lo que el asistente debe saber o hacer <span className="text-xs font-normal text-zinc-500">opcional</span>
          <textarea
            className="min-h-28 rounded-lg border border-zinc-300 px-3 py-2 text-[15px] font-normal"
            maxLength={4000}
            value={f.instructions}
            onChange={(e) => setF({ ...f, instructions: e.target.value })}
            placeholder={"Ej.: Atendemos de lunes a viernes de 10 a 19 h. Los cambios se coordinan con una persona. Hacemos retiro en Providencia con previo aviso. No vendemos por mayor."}
          />
        </label>
        <p className="text-zinc-500">Además usa los datos de envío y pago de la tienda, el catálogo y las preguntas frecuentes de «Chat de la tienda».</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[15px] font-medium">2. Número de WhatsApp (Meta)</h3>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-600">
          <li>En developers.facebook.com crea una app de tipo «Empresa» y agrégale el producto «WhatsApp».</li>
          <li>En WhatsApp → Configuración de la API, agrega el número de la tienda (no puede estar usándose en la app de WhatsApp del teléfono) y copia su «Identificador del número de teléfono».</li>
          <li>En business.facebook.com → Usuarios del sistema, crea un usuario con acceso a la app y genera un token permanente con los permisos whatsapp_business_messaging y whatsapp_business_management.</li>
          <li>En la app → Configuración → Básica, copia la «Clave secreta de la app».</li>
          <li>En WhatsApp → Configuración → Webhook, pega la URL y el token de verificación de abajo, y suscríbete al campo «messages».</li>
        </ol>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-medium">
            Identificador del número de teléfono
            <input className={input} value={f.phoneNumberId} onChange={(e) => setF({ ...f, phoneNumberId: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="1234567890123456" />
          </label>
          <label className="flex flex-col gap-1.5 font-medium">
            Número que ven los clientes <span className="text-xs font-normal text-zinc-500">opcional</span>
            <input className={input} value={f.displayPhone} onChange={(e) => setF({ ...f, displayPhone: e.target.value })} placeholder="+56 9 1234 5678" />
          </label>
          <label className="flex flex-col gap-1.5 font-medium">
            Token de acceso
            <input className={input} type="password" autoComplete="off" value={f.accessToken} onChange={(e) => setF({ ...f, accessToken: e.target.value.trim() })} placeholder={cfg.hasAccessToken ? "Guardado · pega otro para cambiarlo" : "EAAG…"} />
          </label>
          <label className="flex flex-col gap-1.5 font-medium">
            Clave secreta de la app
            <input className={input} type="password" autoComplete="off" value={f.appSecret} onChange={(e) => setF({ ...f, appSecret: e.target.value.trim() })} placeholder={cfg.hasAppSecret ? "Guardada · pega otra para cambiarla" : "Sirve para comprobar que los mensajes vienen de Meta"} />
          </label>
        </div>
        <div className="grid gap-3 rounded-lg bg-zinc-50 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span className="font-medium">URL del webhook</span>
          <code className="break-all text-zinc-700">{webhookUrl}</code>
          <button type="button" onClick={() => copy(webhookUrl)} className="h-8 rounded border border-zinc-300 bg-white px-2 text-xs">Copiar</button>
          <span className="font-medium">Token de verificación</span>
          <code className="break-all text-zinc-700">{cfg.verifyToken}</code>
          <button type="button" onClick={() => copy(cfg.verifyToken)} className="h-8 rounded border border-zinc-300 bg-white px-2 text-xs">Copiar</button>
        </div>
        <p className="text-zinc-500">La URL tiene que ser la de la API en producción (con https). Un preview de Vercel protegido no recibe los avisos de Meta.</p>
      </div>

      <div className="sticky bottom-0 -mx-5 flex items-center gap-4 border-t border-zinc-200 bg-white px-5 py-3">
        <button type="button" onClick={save} disabled={busy} className="h-11 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-60">{busy ? "Guardando…" : "Guardar"}</button>
        <span className="text-zinc-500">Pide el código de verificación en dos pasos.</span>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
