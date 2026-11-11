import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { OrdersService, allowedOrigins, computeTotals, safeOrigin } from './orders.service.js';
import { CheckoutInput, MercadoPagoConfig, WebpayConfig } from './orders.schemas.js';
import { orderKey, verifyOrderKey } from '../integrations/crypto.js';

beforeAll(() => {
  process.env.INTEGRATIONS_KEY = 'k'.repeat(40);
});
afterEach(() => vi.unstubAllGlobals());

const ship = { shippingRM: 3500, shippingRegions: 5990, freeShippingFrom: 60000 };

describe('computeTotals', () => {
  it('cobra envío según la región y lo regala sobre el monto de envío gratis', () => {
    expect(computeTotals(20000, 'Metropolitana', ship, null)).toMatchObject({ shippingTotal: 3500, total: 23500 });
    expect(computeTotals(20000, 'Biobío', ship, null)).toMatchObject({ shippingTotal: 5990, total: 25990 });
    expect(computeTotals(60000, 'Biobío', ship, null)).toMatchObject({ shippingTotal: 0, total: 60000 });
  });
  it('aplica el porcentaje antes de mirar el envío gratis, y el código de envío gratis', () => {
    // 65.000 − 10% = 58.500: ya no llega a los 60.000, paga envío.
    expect(computeTotals(65000, 'Metropolitana', ship, { kind: 'PERCENT', percent: 10 })).toEqual({
      subtotal: 65000,
      discountTotal: 6500,
      shippingTotal: 3500,
      total: 62000,
      freeShippingByCode: false,
    });
    expect(computeTotals(20000, 'Maule', ship, { kind: 'FREE_SHIPPING', percent: 0 })).toMatchObject({ discountTotal: 0, shippingTotal: 0, total: 20000 });
  });
});

describe('safeOrigin y llave del pedido', () => {
  it('acepta https y localhost, rechaza http de otro sitio', () => {
    expect(safeOrigin('https://norte.cl/carrito')).toBe('https://norte.cl');
    expect(safeOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(() => safeOrigin('http://evil.com')).toThrow(BadRequestException);
  });
  it('en producción solo vuelve a las direcciones de la tienda', () => {
    const allowed = allowedOrigins({ VERCEL_ENV: 'production', WEB_ORIGIN: 'https://norte.cl, https://www.norte.cl/' });
    expect(allowed).toEqual(['https://norte.cl', 'https://www.norte.cl']);
    expect(safeOrigin('https://www.norte.cl/checkout', allowed)).toBe('https://www.norte.cl');
    expect(() => safeOrigin('https://norte-falso.cl', allowed)).toThrow(BadRequestException);
    // Previews y local: sin lista.
    expect(allowedOrigins({ VERCEL_ENV: 'preview', WEB_ORIGIN: 'https://norte.cl' })).toBeNull();
    expect(allowedOrigins({ WEB_ORIGIN: 'https://norte.cl' })).toBeNull();
  });
  it('la llave abre solo su pedido', () => {
    const k = orderKey('pedido1');
    expect(verifyOrderKey('pedido1', k)).toBe(true);
    expect(verifyOrderKey('pedido2', k)).toBe(false);
    expect(verifyOrderKey('pedido1', 'x')).toBe(false);
  });
});

describe('esquemas', () => {
  const base = {
    items: [{ variantId: 'v1', qty: 1 }],
    email: 'Ana@Correo.CL',
    name: 'Ana Pérez',
    phone: '+56 9 1234 5678',
    address: { region: 'Metropolitana', comuna: 'Ñuñoa', street: 'Irarrázaval', number: '1234' },
    method: 'webpay',
    origin: 'https://norte.cl',
  };
  it('el checkout no recibe precios y valida región, teléfono y cantidades', () => {
    const ok = CheckoutInput.parse({ ...base, items: [{ variantId: 'v1', qty: 1, price: 1 }] });
    expect(ok.email).toBe('ana@correo.cl');
    expect(ok.items[0]).toEqual({ variantId: 'v1', qty: 1 });
    expect(() => CheckoutInput.parse({ ...base, address: { ...base.address, region: 'Narnia' } })).toThrow();
    expect(() => CheckoutInput.parse({ ...base, phone: 'llámame' })).toThrow();
    expect(() => CheckoutInput.parse({ ...base, items: [{ variantId: 'v1', qty: 99 }] })).toThrow();
    expect(() => CheckoutInput.parse({ ...base, method: 'bitcoin' })).toThrow();
  });
  it('credenciales con formato de Transbank y Mercado Pago', () => {
    expect(() => WebpayConfig.parse({ enabled: true, live: true, commerceCode: '5970', apiKey: '' })).toThrow();
    expect(WebpayConfig.parse({ enabled: true, live: true, commerceCode: '597012345678', apiKey: 'A'.repeat(64) }).commerceCode).toBe('597012345678');
    expect(() => MercadoPagoConfig.parse({ enabled: true, accessToken: 'sk_live_123' })).toThrow();
    expect(MercadoPagoConfig.parse({ enabled: true, accessToken: 'APP_USR-1234567890123456-abcdefghijklmnop' }).enabled).toBe(true);
  });
});

// ─── Servicio con una base simulada ──────────────────────────────────

const owner: StoreAccess = { id: 's1', slug: 'norte', role: 'OWNER' };
const staff: StoreAccess = { ...owner, role: 'STAFF' };

function fakeDb(over: Record<string, unknown> = {}) {
  const db = {
    store: { findUnique: vi.fn().mockResolvedValue({ id: 's1', slug: 'norte', name: 'NORTE', settings: {} }) },
    paymentGateway: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn().mockResolvedValue({}) },
    productVariant: { findMany: vi.fn().mockResolvedValue([]) },
    order: { findFirst: vi.fn().mockResolvedValue(null) },
    payment: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    ...over,
  };
  return { db, service: new OrdersService({ client: db } as unknown as PrismaService) };
}

const checkout = (o: Partial<CheckoutInput> = {}) =>
  ({
    items: [{ variantId: 'v1', qty: 2 }],
    email: 'ana@correo.cl',
    name: 'Ana',
    phone: '+56912345678',
    address: { region: 'Metropolitana', comuna: 'Ñuñoa', street: 'Irarrázaval', number: '1234' },
    method: 'webpay',
    origin: 'https://norte.cl',
    ...o,
  }) as CheckoutInput;

describe('OrdersService', () => {
  it('no deja pagar con un medio apagado', async () => {
    const { service } = fakeDb();
    await expect(service.checkout('norte', checkout())).rejects.toThrow('no está disponible');
  });

  it('rechaza productos de otra tienda o sin stock', async () => {
    const gw = [{ provider: 'WEBPAY', enabled: true, live: false, config: {}, secretEnc: null }];
    const { service, db } = fakeDb({ paymentGateway: { findMany: vi.fn().mockResolvedValue(gw) } });
    await expect(service.checkout('norte', checkout())).rejects.toThrow('ya no está disponible');
    db.productVariant.findMany.mockResolvedValue([{ id: 'v1', sku: null, name: 'M', price: 10000, stock: 1, options: { Talla: 'M' }, product: { name: 'Polera' } }]);
    await expect(service.checkout('norte', checkout())).rejects.toThrow('Solo quedan 1 de Polera');
  });

  it('la página del pedido exige la llave', async () => {
    const { service } = fakeDb();
    await expect(service.publicOrder('norte', 'o1', 'mala')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('una vuelta de Webpay con token desconocido no marca nada', async () => {
    const order = { id: 'o1', store: { id: 's1' }, payments: [{ id: 'p1', provider: 'WEBPAY', status: 'PENDING', externalId: 'tok', amount: 1000 }] };
    const { service, db } = fakeDb({ order: { findFirst: vi.fn().mockResolvedValue(order) } });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const r = await service.webpayReturn('norte', { order: 'o1', token_ws: 'otro' });
    expect(r.key).toBe(orderKey('o1'));
    expect(fetch).not.toHaveBeenCalled();
    expect(db.payment.updateMany).not.toHaveBeenCalled();
  });

  it('Webpay rechazado o con monto distinto deja el pago fallido, sin marcar el pedido', async () => {
    const order = { id: 'o1', store: { id: 's1' }, payments: [{ id: 'p1', provider: 'WEBPAY', status: 'PENDING', externalId: 'tok', amount: 1000 }] };
    const gw = [{ provider: 'WEBPAY', enabled: true, live: false, config: {}, secretEnc: null }];
    const { service, db } = fakeDb({ order: { findFirst: vi.fn().mockResolvedValue(order) }, paymentGateway: { findMany: vi.fn().mockResolvedValue(gw) } });
    const markPaid = vi.spyOn(service, 'markPaid');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ amount: 1, status: 'AUTHORIZED', response_code: 0, buy_order: 'o1', session_id: 'p1' }))));
    await service.webpayReturn('norte', { order: 'o1', token_ws: 'tok' });
    expect(markPaid).not.toHaveBeenCalled();
    expect(db.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1', status: 'PENDING' }, data: expect.objectContaining({ status: 'FAILED' }) }));
  });

  it('Webpay aprobado y con todo calzando marca el pedido pagado', async () => {
    const order = { id: 'o1', store: { id: 's1' }, payments: [{ id: 'p1', provider: 'WEBPAY', status: 'PENDING', externalId: 'tok', amount: 1000 }] };
    const gw = [{ provider: 'WEBPAY', enabled: true, live: false, config: {}, secretEnc: null }];
    const { service } = fakeDb({ order: { findFirst: vi.fn().mockResolvedValue(order) }, paymentGateway: { findMany: vi.fn().mockResolvedValue(gw) } });
    const markPaid = vi.spyOn(service, 'markPaid').mockResolvedValue(true);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ amount: 1000, status: 'AUTHORIZED', response_code: 0, buy_order: 'o1', session_id: 'p1', authorization_code: '1213' })));
    vi.stubGlobal('fetch', fetch);
    await service.webpayReturn('norte', { order: 'o1', token_ws: 'tok' });
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    expect(fetch.mock.calls[0][1].headers['Tbk-Api-Key-Id']).toBe('597055555532');
    // Comercio de prueba: se marca como pago de prueba.
    expect(markPaid).toHaveBeenCalledWith('o1', 'p1', expect.objectContaining({ authorizationCode: '1213' }), true);
  });

  it('Mercado Pago: un pago de otro pedido no se usa', async () => {
    const order = { id: 'o1', store: { id: 's1' }, payments: [{ id: 'p1', provider: 'MERCADOPAGO', status: 'PENDING', amount: 1000, raw: null }] };
    const gw = [{ provider: 'MERCADOPAGO', enabled: true, live: false, config: {}, secretEnc: 'x' }];
    const { service } = fakeDb({ order: { findFirst: vi.fn().mockResolvedValue(order) }, paymentGateway: { findMany: vi.fn().mockResolvedValue(gw) } });
    vi.spyOn(service as unknown as { mpToken: () => string }, 'mpToken').mockReturnValue('APP_USR-x');
    const markPaid = vi.spyOn(service, 'markPaid');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 9, status: 'approved', external_reference: 'otro', transaction_amount: 1000 }))));
    await service.mercadopagoCheck('norte', 'o1', '9');
    expect(markPaid).not.toHaveBeenCalled();
  });

  it('Mercado Pago: un pago en otra moneda no se usa', async () => {
    const order = { id: 'o1', store: { id: 's1' }, payments: [{ id: 'p1', provider: 'MERCADOPAGO', status: 'PENDING', amount: 1000, raw: null }] };
    const gw = [{ provider: 'MERCADOPAGO', enabled: true, live: false, config: {}, secretEnc: 'x' }];
    const { service } = fakeDb({ order: { findFirst: vi.fn().mockResolvedValue(order) }, paymentGateway: { findMany: vi.fn().mockResolvedValue(gw) } });
    vi.spyOn(service as unknown as { mpToken: () => string }, 'mpToken').mockReturnValue('APP_USR-x');
    const markPaid = vi.spyOn(service, 'markPaid');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 9, status: 'approved', external_reference: 'o1', transaction_amount: 1000, currency_id: 'USD' }))));
    await service.mercadopagoCheck('norte', 'o1', '9');
    expect(markPaid).not.toHaveBeenCalled();
  });

  it('confirmar dos veces el mismo pago no descuenta stock de nuevo', async () => {
    const tx = {
      payment: { findUniqueOrThrow: vi.fn().mockResolvedValue({ status: 'AUTHORIZED', orderId: 'o1' }), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      order: { updateMany: vi.fn() },
      $executeRaw: vi.fn(),
    };
    const { service } = fakeDb({ $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) });
    await expect(service.markPaid('o1', 'p1', {})).resolves.toBe(false);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('un pago de prueba deja el pedido pagado pero con aviso de no despachar', async () => {
    const tx = {
      payment: { findUniqueOrThrow: vi.fn().mockResolvedValue({ status: 'PENDING', orderId: 'o1' }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      order: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'o1', storeId: 's1', number: 1001, notes: null, discountCode: null, items: [] }),
        update: vi.fn(),
      },
    };
    const { service } = fakeDb({ $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) });
    await expect(service.markPaid('o1', 'p1', { a: 1 }, true)).resolves.toBe(true);
    expect(tx.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'AUTHORIZED', raw: { a: 1, test: true } } }));
    expect(tx.order.update.mock.calls[0][0].data.notes).toContain('PAGO DE PRUEBA');
  });

  it('activar transferencia pide los datos de la cuenta', async () => {
    const { service } = fakeDb();
    await expect(service.setTransfer(owner, { enabled: true, bank: 'Banco Estado', accountType: 'Cuenta RUT', accountNumber: '', holder: '', rut: '' } as never)).rejects.toThrow('Completa banco');
  });

  it('el personal no cambia los medios de pago ni marca pagado', async () => {
    const { service } = fakeDb({ order: { findFirst: vi.fn().mockResolvedValue({ id: 'o1', status: 'PENDING', payments: [] }) } });
    await expect(service.setWebpay(staff, { enabled: true, live: false, commerceCode: '' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update(staff, 'o1', { status: 'PAID' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cobrar de verdad con Webpay pide código de comercio y llave', async () => {
    const { service } = fakeDb();
    await expect(service.setWebpay(owner, { enabled: true, live: true, commerceCode: '597012345678', apiKey: '' })).rejects.toThrow('llave secreta');
  });
});
