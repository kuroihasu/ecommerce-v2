import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadGatewayException } from '@nestjs/common';

// WhatsApp Business Cloud API (Meta). Solo lo que usa el asistente:
// - verificar la firma de cada aviso (cabecera X-Hub-Signature-256, HMAC-SHA256 del cuerpo
//   tal como llegó, con el "App Secret" de la app de Meta);
// - leer los mensajes de texto que trae el aviso;
// - responder con un mensaje de texto (dentro de las 24 horas desde el último mensaje del
//   cliente no hace falta plantilla).
// https://developers.facebook.com/docs/whatsapp/cloud-api

const V = () => process.env.META_GRAPH_VERSION || 'v26.0';
// WHATSAPP_API_URL apunta a un simulador en pruebas; en producción se ignora.
const BASE = () => (process.env.VERCEL_ENV !== 'production' && process.env.WHATSAPP_API_URL) || 'https://graph.facebook.com';

/** ¿El aviso viene de Meta? Compara la firma con el cuerpo crudo, en tiempo constante. */
export function validSignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string) {
  if (!rawBody || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export type Inbound = { from: string; name?: string; id: string; text: string | null; type: string; phoneNumberId: string };

type WebhookBody = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { from?: string; id?: string; type?: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }[];
      };
    }[];
  }[];
};

/** Mensajes entrantes del aviso. Los avisos de estado (entregado, leído) no traen `messages` y se ignoran. */
export function parseInbound(body: unknown): Inbound[] {
  const b = body as WebhookBody;
  if (b?.object !== 'whatsapp_business_account') return [];
  const out: Inbound[] = [];
  for (const e of b.entry ?? []) {
    for (const c of e.changes ?? []) {
      if (c.field !== 'messages' || !c.value) continue;
      const names = new Map((c.value.contacts ?? []).map((x) => [x.wa_id, x.profile?.name]));
      for (const m of c.value.messages ?? []) {
        if (!m.from || !m.id) continue;
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;
        out.push({ from: m.from, name: names.get(m.from) ?? undefined, id: m.id, text: text?.trim() || null, type: m.type ?? 'unknown', phoneNumberId: c.value.metadata?.phone_number_id ?? '' });
      }
    }
  }
  return out;
}

/** Envía un texto. WhatsApp corta en 4096 caracteres. */
export async function sendText(creds: { phoneNumberId: string; accessToken: string }, to: string, text: string) {
  let res: Response;
  try {
    res = await fetch(`${BASE()}/${V()}/${encodeURIComponent(creds.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: true, body: text.slice(0, 4096) } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new BadGatewayException('No pudimos comunicarnos con WhatsApp. Intenta de nuevo en un rato.');
  }
  const data = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: { code?: number; message?: string } } | null;
  if (!res.ok) {
    console.warn(`[whatsapp] envío respondió ${res.status}`, JSON.stringify(data?.error ?? data).slice(0, 300));
    const code = data?.error?.code;
    throw new BadGatewayException(
      res.status === 401 || code === 190
        ? 'El token de WhatsApp venció o no es válido. Pega uno nuevo en Configurar.'
        : code === 131047
          ? 'Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp solo deja escribirle con una plantilla aprobada.'
          : 'WhatsApp rechazó el mensaje. Revisa el número y el token en Configurar.',
    );
  }
  return data?.messages?.[0]?.id ?? null;
}

/** Deja el mensaje como leído (los dos tics azules). Si falla no importa. */
export async function markRead(creds: { phoneNumberId: string; accessToken: string }, messageId: string) {
  await fetch(`${BASE()}/${V()}/${encodeURIComponent(creds.phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
}

/** Número en el formato de WhatsApp (solo dígitos, con código de país). Acepta "+56 9 1234 5678" o "912345678". */
export function normalizePhone(n: string) {
  let d = n.replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) d = `56${d}`;
  return d;
}
