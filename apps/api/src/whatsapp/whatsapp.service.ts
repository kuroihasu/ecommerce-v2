import { randomBytes, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma, type WaAuthor, type WaChatStatus } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { FailureCounter } from '../auth/rate-limit.js';
import { decrypt, encrypt } from '../integrations/crypto.js';
import { createClient, DEFAULT_MODEL, HISTORY, runAssistant, systemPrompt, type AssistantTools, type ClaudeClient, type StoreFacts, type Turn } from './assistant.js';
import { markRead, normalizePhone, parseInbound, sendText, validSignature, type Inbound } from './cloud-api.js';
import type { WhatsappConfig } from './whatsapp.schemas.js';

type Assistant = Prisma.WhatsappAssistantGetPayload<object>;
type Settings = { shippingRM?: number; shippingRegions?: number; freeShippingFrom?: number; installments?: number; chat?: { faqs?: { question: string; answer: string }[] } };

const DAY = 24 * 60 * 60_000;
// Tope de respuestas del asistente por cliente y hora: frena a quien quiere gastar la
// API key de la tienda o a dos bots respondiéndose entre sí.
const BOT_REPLIES_PER_HOUR = 30;
const TEST_PREFIX = 'prueba:';

const STATUS_ES: Record<string, string> = {
  PENDING: 'esperando el pago',
  PAID: 'pagado, en preparación para despacho',
  FULFILLED: 'despachado',
  DELIVERED: 'entregado',
  CANCELLED: 'anulado',
  REFUNDED: 'reembolsado',
};

// Primera dirección de la tienda (para los enlaces a productos).
export function storeUrl(domain: string | null, env: NodeJS.ProcessEnv = process.env) {
  if (domain) return `https://${domain}`;
  const first = (env.WEB_ORIGIN ?? '').split(',')[0]?.trim();
  try {
    return first ? new URL(first).origin : 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

@Injectable()
export class WhatsappService {
  // Intentos de ver un pedido con datos que no cuadran, por conversación (para que nadie
  // pruebe números de pedido y correos al azar por el chat).
  private readonly orderFails = new FailureCounter(5, 60 * 60_000);
  // Las pruebas pasan un cliente falso.
  clientFor: (apiKey: string) => ClaudeClient = createClient;

  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private async store(slug: string) {
    const store = await this.db.store.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, domain: true, settings: true } });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return store;
  }

  private assistantOf(storeId: string) {
    return this.db.whatsappAssistant.findUnique({ where: { storeId } });
  }

  private aiKey(a: Assistant | null) {
    return a?.aiKeyEnc ? decrypt(a.aiKeyEnc) : process.env.ANTHROPIC_API_KEY || null;
  }

  private assertManager(access: StoreAccess) {
    if (access.role === 'STAFF') throw new ForbiddenException('Solo dueños y administradores pueden hacer esto');
  }

  // ─── Configuración (panel) ─────────────────────────────────────────

  async config(access: StoreAccess) {
    let a = await this.assistantOf(access.id);
    // El token de verificación del webhook se crea la primera vez que se abre la página.
    a ??= await this.db.whatsappAssistant.create({ data: { storeId: access.id, verifyToken: randomBytes(18).toString('base64url') } });
    return {
      enabled: a.enabled,
      live: a.live,
      testNumbers: a.testNumbers,
      phoneNumberId: a.phoneNumberId,
      displayPhone: a.displayPhone,
      verifyToken: a.verifyToken,
      webhookPath: `/whatsapp/${access.slug}/webhook`,
      hasAccessToken: Boolean(a.accessTokenEnc),
      hasAppSecret: Boolean(a.appSecretEnc),
      hasAiKey: Boolean(a.aiKeyEnc),
      aiKeyFromEnv: !a.aiKeyEnc && Boolean(process.env.ANTHROPIC_API_KEY),
      model: a.model,
      instructions: a.instructions,
    };
  }

  async saveConfig(access: StoreAccess, c: WhatsappConfig) {
    this.assertManager(access);
    const prev = await this.assistantOf(access.id);
    const has = (fresh: string | undefined, old: string | null | undefined) => Boolean(fresh || old);
    if (c.enabled) {
      if (!has(c.aiKey, prev?.aiKeyEnc) && !process.env.ANTHROPIC_API_KEY) throw new BadRequestException('Pega la API key de Claude para que el asistente pueda responder.');
      if (!c.phoneNumberId || !has(c.accessToken, prev?.accessTokenEnc) || !has(c.appSecret, prev?.appSecretEnc)) {
        throw new BadRequestException('Para atender WhatsApp completa el identificador del número, el token de acceso y la clave secreta de la app de Meta.');
      }
      if (!c.live && !c.testNumbers.length) throw new BadRequestException('En modo prueba agrega al menos un número que pueda hablar con el asistente (por ejemplo el tuyo).');
    }
    const data = {
      enabled: c.enabled,
      live: c.live,
      testNumbers: [...new Set(c.testNumbers.map(normalizePhone))],
      phoneNumberId: c.phoneNumberId,
      displayPhone: c.displayPhone,
      model: c.model,
      instructions: c.instructions,
      ...(c.accessToken ? { accessTokenEnc: encrypt(c.accessToken) } : {}),
      ...(c.appSecret ? { appSecretEnc: encrypt(c.appSecret) } : {}),
      ...(c.aiKey ? { aiKeyEnc: encrypt(c.aiKey) } : {}),
    };
    await this.db.whatsappAssistant.upsert({
      where: { storeId: access.id },
      create: { storeId: access.id, verifyToken: randomBytes(18).toString('base64url'), ...data },
      update: data,
    });
    return this.config(access);
  }

  // ─── Webhook de Meta ───────────────────────────────────────────────

  /** Meta registra el webhook con un GET: hay que devolver `hub.challenge` si el token cuadra. */
  async verifyWebhook(slug: string, mode: string, token: string, challenge: string) {
    const store = await this.store(slug);
    const a = await this.assistantOf(store.id);
    if (mode !== 'subscribe' || !a || !token || !safeEqual(token, a.verifyToken)) throw new ForbiddenException('Token de verificación incorrecto');
    return challenge;
  }

  async receive(slug: string, rawBody: Buffer | undefined, signature: string | undefined, body: unknown) {
    const store = await this.store(slug);
    const a = await this.assistantOf(store.id);
    // Sin la clave secreta no hay cómo saber si el aviso es de Meta: no se procesa.
    if (!a?.appSecretEnc || !validSignature(rawBody, signature, decrypt(a.appSecretEnc))) throw new UnauthorizedException('Firma inválida');
    for (const m of parseInbound(body)) {
      if (a.phoneNumberId && m.phoneNumberId && m.phoneNumberId !== a.phoneNumberId) continue;
      try {
        await this.handleInbound(store, a, m);
      } catch (e) {
        // Un mensaje que falla no frena a los demás. Ya quedó guardado (si llegó a
        // guardarse), así el equipo lo ve en Conversaciones.
        console.error('[whatsapp] no se pudo atender un mensaje', e instanceof Error ? e.message : e);
      }
    }
    return { ok: true };
  }

  private async handleInbound(store: Awaited<ReturnType<WhatsappService['store']>>, a: Assistant, m: Inbound) {
    const now = new Date();
    const text = m.text ?? `[${m.type === 'audio' ? 'Audio' : m.type === 'image' ? 'Foto' : m.type === 'sticker' ? 'Sticker' : 'Mensaje'} sin texto]`;
    const chat = await this.db.waConversation.upsert({
      where: { storeId_waId: { storeId: store.id, waId: m.from } },
      create: { storeId: store.id, waId: m.from, name: m.name },
      update: {},
    });
    // Meta reintenta los avisos: el id del mensaje es único, el repetido se descarta aquí.
    try {
      await this.db.waMessage.create({ data: { conversationId: chat.id, author: 'CUSTOMER', text: text.slice(0, 4000), waMessageId: m.id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return;
      throw e;
    }
    await this.db.waConversation.update({ where: { id: chat.id }, data: { ...(m.name ? { name: m.name } : {}), lastInboundAt: now, lastMessageAt: now, unread: { increment: 1 } } });

    if (!a.enabled || !a.accessTokenEnc) return;
    if (!a.live && !a.testNumbers.includes(m.from)) return;
    let status = chat.status;
    if (status === 'CLOSED') {
      // Un cliente que vuelve a escribir abre la conversación de nuevo con el asistente.
      await this.db.waConversation.update({ where: { id: chat.id }, data: { status: 'BOT', handoffReason: null } });
      status = 'BOT';
    }
    if (status !== 'BOT') return;

    const apiKey = this.aiKey(a);
    if (!apiKey) return;
    const creds = { phoneNumberId: a.phoneNumberId || m.phoneNumberId, accessToken: decrypt(a.accessTokenEnc) };
    void markRead(creds, m.id);

    const recent = await this.db.waMessage.count({ where: { conversationId: chat.id, author: 'BOT', createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } });
    if (recent >= BOT_REPLIES_PER_HOUR) {
      await this.handoff(chat.id, 'Muchos mensajes seguidos: el asistente se pausó en esta conversación.');
      return;
    }

    let reply: string;
    if (!m.text) {
      reply = 'Por ahora solo puedo leer mensajes de texto. ¿Me cuentas por escrito en qué te ayudo?';
    } else {
      const result = await this.answer(store, a, apiKey, chat.id).catch(async (e: unknown) => {
        console.error('[whatsapp] el asistente falló', e instanceof Error ? e.message : e);
        await this.handoff(chat.id, 'El asistente tuvo un error al responder.');
        return { reply: 'Gracias por escribir. En un momento te responde una persona del equipo por este chat.', handoff: 'error' };
      });
      reply = result.reply;
    }
    if (!reply) return;
    const waMessageId = await sendText(creds, m.from, reply);
    await this.saveOutgoing(chat.id, 'BOT', reply, waMessageId);
  }

  private async saveOutgoing(conversationId: string, author: WaAuthor, text: string, waMessageId: string | null, simulated = false) {
    await this.db.$transaction([
      this.db.waMessage.create({ data: { conversationId, author, text, waMessageId, simulated } }),
      this.db.waConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);
  }

  private handoff(conversationId: string, reason: string) {
    return this.db.waConversation.update({ where: { id: conversationId }, data: { status: 'HUMAN', handoffReason: reason } });
  }

  // Corre el asistente sobre los últimos mensajes de la conversación.
  private async answer(store: Awaited<ReturnType<WhatsappService['store']>>, a: Assistant, apiKey: string, conversationId: string, simulated = false) {
    const rows = await this.db.waMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: HISTORY, select: { author: true, text: true } });
    const history: Turn[] = rows.reverse();
    const facts = await this.facts(store, a);
    const tools: AssistantTools = {
      searchProducts: (q) => this.searchProducts(store.id, facts.url, q),
      orderStatus: (n, email) => this.orderStatus(store.id, conversationId, n, email),
      handoff: async (reason) => {
        // En la prueba del panel no se pausa la conversación: se muestra que derivaría.
        if (!simulated) await this.handoff(conversationId, reason);
      },
    };
    return runAssistant({ client: this.clientFor(apiKey), model: a.model || DEFAULT_MODEL, system: systemPrompt(facts), history, tools });
  }

  private async facts(store: Awaited<ReturnType<WhatsappService['store']>>, a: Assistant): Promise<StoreFacts> {
    const s = (store.settings ?? {}) as Settings;
    const shippingRM = s.shippingRM ?? 3500;
    const shippingRegions = s.shippingRegions ?? 5990;
    const freeShippingFrom = s.freeShippingFrom ?? 60000;
    const clp = (n: number) => `$${n.toLocaleString('es-CL')}`;
    const fill = (t: string) =>
      t
        .replaceAll('{envio_rm}', clp(shippingRM))
        .replaceAll('{envio_regiones}', clp(shippingRegions))
        .replaceAll('{envio_gratis}', clp(freeShippingFrom))
        .replaceAll('{cuotas}', String(s.installments ?? ''));
    const faqs = (s.chat?.faqs ?? [])
      .map((f) => ({ question: f.question, answer: fill(f.answer) }))
      // Una respuesta con datos que el asistente no puede completar (p. ej. el código de
      // descuento del momento) se deja fuera: mejor que derive a que invente.
      .filter((f) => f.question && f.answer && !/\{[a-z_]+\}/.test(f.answer));
    const gateways = await this.db.paymentGateway.findMany({ where: { storeId: store.id, enabled: true }, select: { provider: true } });
    const names: Record<string, string> = { WEBPAY: 'Webpay (tarjetas de crédito y débito)', MERCADOPAGO: 'Mercado Pago', TRANSFER: 'transferencia bancaria', FLOW: 'Flow' };
    return {
      name: store.name,
      url: storeUrl(store.domain),
      shippingRM,
      shippingRegions,
      freeShippingFrom,
      installments: s.installments,
      payments: gateways.map((g) => names[g.provider] ?? g.provider),
      faqs,
      instructions: a.instructions,
    };
  }

  // ─── Herramientas del asistente ───────────────────────────────────

  async searchProducts(storeId: string, url: string, query: string) {
    const words = query
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9ñ]+/)
      .filter((w) => w.length > 2)
      .slice(0, 6);
    const or: Prisma.ProductWhereInput[] = words.flatMap((w) => [
      { name: { contains: w, mode: 'insensitive' as const } },
      { description: { contains: w, mode: 'insensitive' as const } },
      { tags: { has: w } },
      { category: { name: { contains: w, mode: 'insensitive' as const } } },
    ]);
    const select = {
      name: true,
      slug: true,
      tags: true,
      category: { select: { name: true } },
      variants: { select: { options: true, price: true, compareAtPrice: true, stock: true }, orderBy: { position: 'asc' as const } },
    };
    let products = or.length ? await this.db.product.findMany({ where: { storeId, status: 'ACTIVE', OR: or }, select, take: 8, orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] }) : [];
    const exact = products.length > 0;
    if (!exact) products = await this.db.product.findMany({ where: { storeId, status: 'ACTIVE' }, select, take: 6, orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] });
    return {
      nota: exact ? undefined : 'No hubo coincidencias con esa búsqueda; estos son destacados y novedades de la tienda.',
      productos: products.map((p) => {
        const prices = p.variants.map((v) => v.price);
        const inStock = p.variants.filter((v) => v.stock > 0);
        const label = (o: unknown) => Object.values((o ?? {}) as Record<string, string>).join(' / ') || 'Única';
        return {
          nombre: p.name,
          categoria: p.category?.name,
          precio: prices.length ? Math.min(...prices) : null,
          precioAntes: p.variants.find((v) => v.compareAtPrice && v.compareAtPrice > v.price)?.compareAtPrice ?? undefined,
          disponible: inStock.map((v) => (v.stock <= 3 ? `${label(v.options)} (quedan pocas)` : label(v.options))),
          agotado: inStock.length === 0,
          etiquetas: p.tags,
          enlace: `${url}/producto/${p.slug}`,
        };
      }),
    };
  }

  async orderStatus(storeId: string, key: string, number: number, email: string) {
    const notFound = { encontrado: false, mensaje: 'No encontramos un pedido con ese número y ese correo. Pide al cliente que los revise (están en el correo de confirmación).' };
    if (this.orderFails.blocked(key)) return { encontrado: false, mensaje: 'Demasiados intentos con datos que no cuadran. Deriva a una persona.' };
    if (!Number.isInteger(number) || number <= 0) return notFound;
    const order = await this.db.order.findUnique({
      where: { storeId_number: { storeId, number } },
      select: {
        number: true,
        email: true,
        status: true,
        total: true,
        createdAt: true,
        items: { select: { name: true, quantity: true } },
        shipments: { select: { carrier: true, trackingNumber: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    // Mismo mensaje si el pedido no existe o si el correo no es el suyo: no se revela cuál falló.
    if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) {
      this.orderFails.fail(key);
      return notFound;
    }
    const s = order.shipments[0];
    return {
      encontrado: true,
      numero: order.number,
      estado: STATUS_ES[order.status] ?? order.status,
      fecha: order.createdAt.toISOString().slice(0, 10),
      total: order.total,
      productos: order.items.map((i) => `${i.quantity} × ${i.name}`),
      despacho: s ? { empresa: s.carrier, seguimiento: s.trackingNumber ?? 'aún sin número' } : undefined,
    };
  }

  // ─── Conversaciones (panel) ────────────────────────────────────────

  async conversations(access: StoreAccess, status?: string) {
    const where: Prisma.WaConversationWhereInput = { storeId: access.id, NOT: { waId: { startsWith: TEST_PREFIX } } };
    if (status && ['BOT', 'HUMAN', 'CLOSED'].includes(status)) where.status = status as WaChatStatus;
    const rows = await this.db.waConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true, author: true } } },
    });
    return rows.map(({ messages, ...c }) => ({ ...c, last: messages[0] ?? null }));
  }

  private async conversation(access: StoreAccess, id: string) {
    const c = await this.db.waConversation.findFirst({ where: { id, storeId: access.id } });
    if (!c) throw new NotFoundException('Conversación no encontrada');
    return c;
  }

  async messages(access: StoreAccess, id: string) {
    const c = await this.conversation(access, id);
    const messages = await this.db.waMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, author: true, text: true, createdAt: true } });
    if (c.unread) await this.db.waConversation.update({ where: { id }, data: { unread: 0 } });
    return { ...c, unread: 0, canReply: Boolean(c.lastInboundAt && Date.now() - c.lastInboundAt.getTime() < DAY), messages: messages.reverse() };
  }

  // El equipo responde desde el panel: la conversación queda en manos de una persona.
  async reply(access: StoreAccess, id: string, text: string) {
    const c = await this.conversation(access, id);
    const a = await this.assistantOf(access.id);
    if (!a?.accessTokenEnc || !a.phoneNumberId) throw new BadRequestException('Conecta el número de WhatsApp en Configurar para responder desde aquí.');
    if (!c.lastInboundAt || Date.now() - c.lastInboundAt.getTime() >= DAY) {
      throw new ConflictException('Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp solo deja escribirle con una plantilla aprobada.');
    }
    const waMessageId = await sendText({ phoneNumberId: a.phoneNumberId, accessToken: decrypt(a.accessTokenEnc) }, c.waId, text);
    await this.saveOutgoing(id, 'STAFF', text, waMessageId);
    if (c.status === 'BOT') await this.db.waConversation.update({ where: { id }, data: { status: 'HUMAN', handoffReason: 'El equipo tomó la conversación.' } });
    return this.messages(access, id);
  }

  async setStatus(access: StoreAccess, id: string, status: WaChatStatus) {
    await this.conversation(access, id);
    await this.db.waConversation.update({ where: { id }, data: { status, ...(status === 'BOT' ? { handoffReason: null } : {}) } });
    return this.messages(access, id);
  }

  // ─── Probar desde el panel (sin WhatsApp) ──────────────────────────

  private testWaId = (userId: string) => `${TEST_PREFIX}${userId}`.slice(0, 60);

  async testChat(access: StoreAccess, userId: string) {
    const c = await this.db.waConversation.findUnique({ where: { storeId_waId: { storeId: access.id, waId: this.testWaId(userId) } } });
    if (!c) return { messages: [], handoff: null };
    const messages = await this.db.waMessage.findMany({ where: { conversationId: c.id }, orderBy: { createdAt: 'asc' }, take: 100, select: { id: true, author: true, text: true, createdAt: true } });
    return { messages, handoff: c.handoffReason };
  }

  async test(access: StoreAccess, userId: string, text: string) {
    const store = await this.store(access.slug);
    const a = await this.assistantOf(access.id);
    if (!a) throw new NotFoundException('Abre la configuración del asistente primero');
    const apiKey = this.aiKey(a);
    if (!apiKey) throw new BadRequestException('Pega la API key de Claude en Configurar para probar el asistente.');
    const waId = this.testWaId(userId);
    const chat = await this.db.waConversation.upsert({ where: { storeId_waId: { storeId: access.id, waId } }, create: { storeId: access.id, waId, name: 'Prueba del panel' }, update: {} });
    await this.db.waMessage.create({ data: { conversationId: chat.id, author: 'CUSTOMER', text, simulated: true } });
    const result = await this.answer(store, a, apiKey, chat.id, true);
    if (result.reply) await this.saveOutgoing(chat.id, 'BOT', result.reply, null, true);
    await this.db.waConversation.update({ where: { id: chat.id }, data: { handoffReason: result.handoff } });
    return this.testChat(access, userId);
  }

  async resetTest(access: StoreAccess, userId: string) {
    await this.db.waConversation.deleteMany({ where: { storeId: access.id, waId: this.testWaId(userId) } });
    return { messages: [], handoff: null };
  }
}
