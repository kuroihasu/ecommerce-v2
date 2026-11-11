import { createHmac } from 'node:crypto';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@tienda/db';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { encrypt } from '../integrations/crypto.js';
import { runAssistant, systemPrompt, toMessages, type AssistantTools, type ClaudeClient } from './assistant.js';
import { normalizePhone, parseInbound, validSignature } from './cloud-api.js';
import { WhatsappService, storeUrl } from './whatsapp.service.js';
import { WhatsappConfig } from './whatsapp.schemas.js';

beforeAll(() => {
  process.env.INTEGRATIONS_KEY = 'k'.repeat(40);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const SECRET = 'app-secret';
const sign = (raw: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;

const inbound = (o: { id?: string; from?: string; text?: string | null; type?: string; phoneNumberId?: string } = {}) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          field: 'messages',
          value: {
            metadata: { phone_number_id: o.phoneNumberId ?? '111' },
            contacts: [{ wa_id: o.from ?? '56911112222', profile: { name: 'Ana' } }],
            messages: [{ from: o.from ?? '56911112222', id: o.id ?? 'wamid.1', type: o.type ?? 'text', ...(o.text === null ? {} : { text: { body: o.text ?? '¿Tienen polerones?' } }) }],
          },
        },
      ],
    },
  ],
});

// Respuestas de Claude armadas a mano.
const msg = (content: unknown[], stop_reason = 'end_turn') => ({ id: 'm', type: 'message', role: 'assistant', model: 'x', content, stop_reason, usage: {} }) as never;
const textMsg = (t: string) => msg([{ type: 'text', text: t }]);
const toolMsg = (name: string, input: unknown, id = 'tu1') => msg([{ type: 'tool_use', id, name, input }], 'tool_use');
const fakeClient = (...answers: unknown[]) => {
  const create = vi.fn();
  for (const a of answers) create.mockResolvedValueOnce(a);
  return { client: { beta: { messages: { create } } } as unknown as ClaudeClient, create };
};
const tools = () => ({
  searchProducts: vi.fn().mockResolvedValue({ productos: [{ nombre: 'Polerón Norte', precio: 29990 }] }),
  orderStatus: vi.fn().mockResolvedValue({ encontrado: false }),
  handoff: vi.fn<(reason: string) => Promise<void>>().mockResolvedValue(undefined),
}) satisfies AssistantTools;

describe('WhatsApp Cloud API', () => {
  it('acepta solo avisos firmados con la clave secreta de la app', () => {
    const raw = JSON.stringify(inbound());
    expect(validSignature(Buffer.from(raw), sign(raw), SECRET)).toBe(true);
    expect(validSignature(Buffer.from(raw), sign(raw, 'otra'), SECRET)).toBe(false);
    expect(validSignature(Buffer.from(`${raw} `), sign(raw), SECRET)).toBe(false);
    expect(validSignature(Buffer.from(raw), undefined, SECRET)).toBe(false);
    expect(validSignature(undefined, sign(raw), SECRET)).toBe(false);
  });

  it('lee textos y botones, e ignora avisos de estado', () => {
    expect(parseInbound(inbound())).toEqual([{ from: '56911112222', name: 'Ana', id: 'wamid.1', text: '¿Tienen polerones?', type: 'text', phoneNumberId: '111' }]);
    expect(parseInbound(inbound({ text: null, type: 'audio' }))[0]).toMatchObject({ text: null, type: 'audio' });
    const status = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'x', status: 'read' }] } }] }] };
    expect(parseInbound(status)).toEqual([]);
    expect(parseInbound({ object: 'page' })).toEqual([]);
  });

  it('normaliza números chilenos', () => {
    expect(normalizePhone('+56 9 1111 2222')).toBe('56911112222');
    expect(normalizePhone('911112222')).toBe('56911112222');
  });
});

describe('asistente', () => {
  it('alterna turnos, empieza por el cliente y marca lo que escribió el equipo', () => {
    expect(
      toMessages([
        { author: 'BOT', text: 'hola (suelto)' },
        { author: 'CUSTOMER', text: 'a' },
        { author: 'CUSTOMER', text: 'b' },
        { author: 'STAFF', text: 'te ayudo yo' },
        { author: 'CUSTOMER', text: 'gracias' },
      ]),
    ).toEqual([
      { role: 'user', content: 'a\n\nb' },
      { role: 'assistant', content: '[Respondió una persona del equipo]: te ayudo yo' },
      { role: 'user', content: 'gracias' },
    ]);
  });

  it('busca en el catálogo antes de responder y pide respaldo ante un rechazo', async () => {
    const { client, create } = fakeClient(toolMsg('buscar_productos', { consulta: 'polerón' }), textMsg('Tenemos el *Polerón Norte* a $29.990.'));
    const t = tools();
    const r = await runAssistant({ client, model: 'claude-opus-5-5', system: 's', history: [{ author: 'CUSTOMER', text: '¿Tienen polerones?' }], tools: t });
    expect(r).toEqual({ reply: 'Tenemos el *Polerón Norte* a $29.990.', handoff: null });
    expect(t.searchProducts).toHaveBeenCalledWith('polerón');
    expect(create).toHaveBeenCalledTimes(2);
    const first = create.mock.calls[0][0];
    expect(first).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'], output_config: { effort: 'low' } });
    // La segunda vuelta lleva el resultado de la herramienta.
    const second = create.mock.calls[1][0];
    expect(second.messages.at(-1).content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'tu1' });
  });

  it('Haiku va sin modelo de respaldo', async () => {
    const { client, create } = fakeClient(textMsg('hola'));
    await runAssistant({ client, model: 'claude-haiku-5-5', system: 's', history: [{ author: 'CUSTOMER', text: 'hola' }], tools: tools() });
    expect(create.mock.calls[0][0]).not.toHaveProperty('fallbacks');
  });

  it('deriva a una persona cuando el modelo lo pide o rechaza', async () => {
    const a = fakeClient(toolMsg('derivar_a_persona', { motivo: 'Quiere cambiar una talla' }), textMsg('Listo, te escribe alguien del equipo.'));
    const t = tools();
    const r = await runAssistant({ client: a.client, model: 'claude-opus-5-5', system: 's', history: [{ author: 'CUSTOMER', text: 'quiero cambiar' }], tools: t });
    expect(r).toEqual({ reply: 'Listo, te escribe alguien del equipo.', handoff: 'Quiere cambiar una talla' });
    expect(t.handoff).toHaveBeenCalledWith('Quiere cambiar una talla');

    const b = fakeClient(msg([], 'refusal'));
    const t2 = tools();
    const r2 = await runAssistant({ client: b.client, model: 'claude-opus-5-5', system: 's', history: [{ author: 'CUSTOMER', text: '...' }], tools: t2 });
    expect(r2.handoff).toBeTruthy();
    expect(r2.reply).toMatch(/persona del equipo/);
    expect(t2.handoff).toHaveBeenCalled();
  });

  it('el texto del sistema no cambia entre mensajes (caché) y trae los datos de la tienda', () => {
    const f = { name: 'NORTE', url: 'https://norte.cl', shippingRM: 3500, shippingRegions: 5990, freeShippingFrom: 60000, installments: 6, payments: ['Webpay'], faqs: [{ question: '¿Cambios?', answer: '30 días' }], instructions: 'Horario: lunes a viernes.' };
    expect(systemPrompt(f)).toBe(systemPrompt(f));
    expect(systemPrompt(f)).toContain('$3.500');
    expect(systemPrompt(f)).toContain('Horario: lunes a viernes.');
    expect(systemPrompt(f)).toContain('¿Cambios?');
  });
});

// ─── Servicio con base falsa ─────────────────────────────────────────

const access: StoreAccess = { id: 's1', slug: 'norte', role: 'OWNER' };

function setup(assistant: Record<string, unknown> | null, over: { conversation?: Record<string, unknown>; botCount?: number; dup?: boolean } = {}) {
  const conversation = { id: 'c1', storeId: 's1', waId: '56911112222', status: 'BOT', ...over.conversation };
  const db = {
    store: { findUnique: vi.fn().mockResolvedValue({ id: 's1', slug: 'norte', name: 'NORTE', domain: null, settings: {} }) },
    whatsappAssistant: { findUnique: vi.fn().mockResolvedValue(assistant), upsert: vi.fn().mockResolvedValue({}), create: vi.fn() },
    waConversation: { upsert: vi.fn().mockResolvedValue(conversation), update: vi.fn().mockResolvedValue(conversation), findFirst: vi.fn().mockResolvedValue(conversation) },
    waMessage: {
      create: over.dup ? vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })) : vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(over.botCount ?? 0),
      findMany: vi.fn().mockResolvedValue([{ author: 'CUSTOMER', text: '¿Tienen polerones?' }]),
    },
    paymentGateway: { findMany: vi.fn().mockResolvedValue([{ provider: 'WEBPAY' }]) },
    product: { findMany: vi.fn().mockResolvedValue([]) },
    order: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const service = new WhatsappService({ client: db } as unknown as PrismaService);
  const ai = fakeClient(textMsg('¡Hola Ana! Sí, tenemos polerones.'));
  service.clientFor = () => ai.client;
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.out' }] }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return { db, service, ai, fetchMock };
}

const live = () => ({
  storeId: 's1',
  enabled: true,
  live: true,
  testNumbers: [],
  phoneNumberId: '111',
  verifyToken: 'tok-verif',
  accessTokenEnc: encrypt('EAAG-token'),
  appSecretEnc: encrypt(SECRET),
  aiKeyEnc: encrypt('sk-ant-x'),
  model: 'claude-opus-5-5',
  instructions: '',
});

const deliver = (service: WhatsappService, body = inbound()) => {
  const raw = JSON.stringify(body);
  return service.receive('norte', Buffer.from(raw), sign(raw), body);
};

describe('webhook', () => {
  it('Meta registra el webhook solo con el token correcto', async () => {
    const { service } = setup(live());
    await expect(service.verifyWebhook('norte', 'subscribe', 'tok-verif', 'abc')).resolves.toBe('abc');
    await expect(service.verifyWebhook('norte', 'subscribe', 'otro', 'abc')).rejects.toThrow(ForbiddenException);
  });

  it('rechaza un aviso sin firma válida y no guarda nada', async () => {
    const { service, db } = setup(live());
    const raw = JSON.stringify(inbound());
    await expect(service.receive('norte', Buffer.from(raw), sign(raw, 'falsa'), inbound())).rejects.toThrow(UnauthorizedException);
    expect(db.waConversation.upsert).not.toHaveBeenCalled();
  });

  it('responde por WhatsApp con lo que dice el asistente', async () => {
    const { service, db, ai, fetchMock } = setup(live());
    await deliver(service);
    expect(ai.create).toHaveBeenCalledTimes(1);
    const send = fetchMock.mock.calls.find(([, init]) => JSON.parse(init.body).type === 'text')!;
    expect(send[0]).toMatch(/\/111\/messages$/);
    expect(send[1].headers.Authorization).toBe('Bearer EAAG-token');
    expect(JSON.parse(send[1].body)).toMatchObject({ to: '56911112222', text: { body: '¡Hola Ana! Sí, tenemos polerones.' } });
    expect(db.$transaction).toHaveBeenCalled();
  });

  it('un aviso repetido no se responde dos veces', async () => {
    const { service, ai } = setup(live(), { dup: true });
    await deliver(service);
    expect(ai.create).not.toHaveBeenCalled();
  });

  it('en modo prueba solo responde a los números de prueba', async () => {
    const { service, ai } = setup({ ...live(), live: false, testNumbers: ['56999998888'] });
    await deliver(service);
    expect(ai.create).not.toHaveBeenCalled();
    await deliver(service, inbound({ from: '56999998888', id: 'wamid.2' }));
    expect(ai.create).toHaveBeenCalledTimes(1);
  });

  it('calla si la conversación está con una persona, o si el asistente está apagado', async () => {
    const human = setup(live(), { conversation: { status: 'HUMAN' } });
    await deliver(human.service);
    expect(human.ai.create).not.toHaveBeenCalled();
    const off = setup({ ...live(), enabled: false });
    await deliver(off.service);
    expect(off.ai.create).not.toHaveBeenCalled();
    // Igual queda guardado para verlo en Conversaciones.
    expect(off.db.waMessage.create).toHaveBeenCalled();
  });

  it('pausa la conversación si hay demasiadas respuestas en una hora', async () => {
    const { service, ai, db } = setup(live(), { botCount: 30 });
    await deliver(service);
    expect(ai.create).not.toHaveBeenCalled();
    expect(db.waConversation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'HUMAN' }) }));
  });

  it('a un audio le pide escribir, sin gastar la IA', async () => {
    const { service, ai, fetchMock } = setup(live());
    await deliver(service, inbound({ text: null, type: 'audio' }));
    expect(ai.create).not.toHaveBeenCalled();
    const send = fetchMock.mock.calls.find(([, init]) => JSON.parse(init.body).type === 'text')!;
    expect(JSON.parse(send[1].body).text.body).toMatch(/solo puedo leer mensajes de texto/);
  });

  it('si la IA falla, pasa la conversación al equipo y avisa al cliente', async () => {
    const { service, db, fetchMock } = setup(live());
    service.clientFor = () => ({ beta: { messages: { create: vi.fn().mockRejectedValue(new Error('caída')) } } }) as unknown as ClaudeClient;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await deliver(service);
    expect(db.waConversation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'HUMAN' }) }));
    const send = fetchMock.mock.calls.find(([, init]) => JSON.parse(init.body).type === 'text')!;
    expect(JSON.parse(send[1].body).text.body).toMatch(/persona del equipo/);
  });
});

describe('pedidos por el chat', () => {
  const order = { number: 1042, email: 'ana@correo.cl', status: 'FULFILLED', total: 33490, createdAt: new Date('2026-11-01T12:00:00Z'), items: [{ name: 'Polerón Norte · M', quantity: 1 }], shipments: [{ carrier: 'starken', trackingNumber: 'ST123', status: 'IN_TRANSIT' }] };

  it('muestra el pedido solo con número y correo correctos, sin decir cuál falló', async () => {
    const { service, db } = setup(live());
    db.order.findUnique.mockResolvedValue(order);
    await expect(service.orderStatus('s1', 'c1', 1042, ' ANA@correo.cl ')).resolves.toMatchObject({ encontrado: true, estado: 'despachado', despacho: { empresa: 'starken', seguimiento: 'ST123' } });
    const wrong = await service.orderStatus('s1', 'c2', 1042, 'otra@correo.cl');
    db.order.findUnique.mockResolvedValue(null);
    const missing = await service.orderStatus('s1', 'c3', 9999, 'ana@correo.cl');
    expect(wrong).toEqual(missing);
    expect(JSON.stringify(wrong)).not.toContain('Polerón');
  });

  it('bloquea a quien prueba muchos datos al azar', async () => {
    const { service, db } = setup(live());
    for (let i = 0; i < 5; i++) await service.orderStatus('s1', 'c9', 1000 + i, 'x@x.cl');
    db.order.findUnique.mockResolvedValue(order);
    await expect(service.orderStatus('s1', 'c9', 1042, 'ana@correo.cl')).resolves.toMatchObject({ encontrado: false, mensaje: expect.stringMatching(/Demasiados intentos/) });
  });
});

describe('configuración', () => {
  const base = { enabled: true, live: true, testNumbers: [], phoneNumberId: '111', displayPhone: '', model: 'claude-opus-5-5', instructions: '' };

  it('para encender exige la API key y las credenciales de Meta', async () => {
    const { service } = setup(null);
    delete process.env.ANTHROPIC_API_KEY;
    await expect(service.saveConfig(access, WhatsappConfig.parse(base))).rejects.toThrow(BadRequestException);
    await expect(service.saveConfig(access, WhatsappConfig.parse({ ...base, aiKey: 'sk-ant-x' }))).rejects.toThrow(/token de acceso/);
    await expect(service.saveConfig(access, WhatsappConfig.parse({ ...base, live: false, aiKey: 'k', accessToken: 't', appSecret: 's' }))).rejects.toThrow(/modo prueba/);
  });

  it('guarda los secretos cifrados y nunca los devuelve', async () => {
    const { service, db } = setup(null);
    db.whatsappAssistant.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ ...live(), testNumbers: ['56911112222'] });
    const out = await service.saveConfig(access, WhatsappConfig.parse({ ...base, live: false, testNumbers: ['+56 9 1111 2222'], aiKey: 'sk-ant-secreta', accessToken: 'EAAG-secreto', appSecret: 'clave' }));
    const saved = db.whatsappAssistant.upsert.mock.calls[0][0].update;
    expect(saved.testNumbers).toEqual(['56911112222']);
    expect(saved.aiKeyEnc).toMatch(/^v1\./);
    expect(JSON.stringify(saved)).not.toContain('sk-ant-secreta');
    expect(JSON.stringify(out)).not.toMatch(/EAAG|sk-ant|v1\./);
    expect(out).toMatchObject({ hasAiKey: true, hasAccessToken: true, hasAppSecret: true, webhookPath: '/whatsapp/norte/webhook' });
  });

  it('un vendedor (STAFF) no puede cambiarla', async () => {
    const { service } = setup(null);
    await expect(service.saveConfig({ ...access, role: 'STAFF' }, WhatsappConfig.parse({ ...base, enabled: false }))).rejects.toThrow(ForbiddenException);
  });

  it('enlaces a la tienda: dominio propio o la primera dirección de WEB_ORIGIN', () => {
    expect(storeUrl('norte.cl')).toBe('https://norte.cl');
    expect(storeUrl(null, { WEB_ORIGIN: 'https://tienda.vercel.app/, http://localhost:3000' })).toBe('https://tienda.vercel.app');
  });
});
