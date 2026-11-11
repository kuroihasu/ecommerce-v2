import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { encrypt, orderKey } from '../integrations/crypto.js';
import { BillingService } from './billing.service.js';
import { BillingConfigInput } from './billing.schemas.js';
import { amountsOf, buildBoleta } from './dte.js';
import { describeError, OPENFACTURA_DEMO_KEY } from './openfactura.js';
import { checkDigit, normalizeRut } from './rut.js';

beforeAll(() => {
  process.env.INTEGRATIONS_KEY = 'k'.repeat(40);
});
afterEach(() => vi.unstubAllGlobals());

const issuer = { rut: '76123456-0', name: 'NORTE SPA', activity: 'VENTA DE ROPA', address: 'Av. Siempre Viva 123', comuna: 'Ñuñoa' };

describe('RUT', () => {
  it('valida el dígito verificador y deja el formato del SII', () => {
    expect(checkDigit('11111111')).toBe('1');
    expect(normalizeRut('11.111.111-1')).toBe('11111111-1');
    expect(normalizeRut('76.795.561-8')).toBe('76795561-8');
    expect(normalizeRut('66666666-6')).toBe('66666666-6');
    expect(normalizeRut('12.345.678-k')).toBe(normalizeRut('12345678K'));
    expect(normalizeRut('11.111.111-2')).toBeNull();
    expect(normalizeRut('hola')).toBeNull();
    expect(normalizeRut(null)).toBeNull();
  });
});

describe('boleta', () => {
  const base = {
    type: 39 as const,
    issueDate: '2026-11-11',
    issuer,
    receiver: { rut: '66666666-6' },
    items: [
      { name: 'Polera (Negro · M)', quantity: 2, unitPrice: 15000 },
      { name: 'Gorro', quantity: 1, unitPrice: 9990 },
    ],
    shipping: 3500,
    discount: 3999,
    total: 30000 + 9990 + 3500 - 3999,
  };

  it('separa neto e IVA sobre el total, con precios brutos en el detalle', () => {
    expect(amountsOf(39, 11900)).toEqual({ total: 11900, net: 10000, tax: 1900, exempt: 0 });
    expect(amountsOf(41, 11900)).toEqual({ total: 11900, net: 0, tax: 0, exempt: 11900 });
    const d = buildBoleta(base);
    expect(d.Encabezado.IdDoc).toEqual({ TipoDTE: 39, Folio: 0, FchEmis: '2026-11-11', IndServicio: 3 });
    expect(d.Encabezado.Emisor).toMatchObject({ RUTEmisor: '76123456-0', RznSocEmisor: 'NORTE SPA', GiroEmisor: 'VENTA DE ROPA', CmnaOrigen: 'Ñuñoa' });
    expect(d.Encabezado.Receptor).toEqual({ RUTRecep: '66666666-6' });
    const t = d.Encabezado.Totales as { MntNeto: number; IVA: number; MntTotal: number };
    expect(t.MntTotal).toBe(base.total);
    expect(t.MntNeto + t.IVA).toBe(base.total);
    // Productos + despacho, y el descuento como descuento global.
    expect(d.Detalle).toHaveLength(3);
    expect(d.Detalle[0]).toEqual({ NroLinDet: 1, NmbItem: 'Polera (Negro · M)', QtyItem: 2, PrcItem: 15000, MontoItem: 30000 });
    expect(d.Detalle[2]).toMatchObject({ NmbItem: 'Despacho', MontoItem: 3500 });
    expect(d.DscRcgGlobal).toEqual([{ NroLinDR: 1, TpoMov: 'D', GlosaDR: 'Descuento', TpoValor: '$', ValorDR: 3999 }]);
  });

  it('boleta exenta y sin envío ni descuento', () => {
    const d = buildBoleta({ ...base, type: 41, shipping: 0, discount: 0, total: 39990 });
    expect(d.Encabezado.Totales).toEqual({ MntExe: 39990, MntTotal: 39990 });
    expect(d.Detalle.every((l) => 'IndExe' in l)).toBe(true);
    expect(d).not.toHaveProperty('DscRcgGlobal');
  });

  it('no arma una boleta cuyos montos no cuadran con el pedido', () => {
    expect(() => buildBoleta({ ...base, total: 1 })).toThrow('no cuadran');
  });

  it('lee los errores de OpenFactura con y sin envoltorio', () => {
    expect(describeError(400, { error: { message: 'Documento inválido', code: 'OF-10', details: [{ field: 'Emisor.RUTEmisor', issue: 'no coincide' }] } })).toEqual({
      message: 'Documento inválido · Emisor.RUTEmisor: no coincide',
      code: 'OF-10',
    });
    expect(describeError(422, { message: 'x', details: { Folio: 'sin folios' } }).message).toBe('x · Folio: sin folios');
    expect(describeError(500, null).message).toBe('OpenFactura respondió 500');
  });

  it('la configuración valida el RUT de la empresa', () => {
    const ok = BillingConfigInput.parse({ enabled: true, live: false, issuer: { ...issuer, rut: '76.795.561-8' } });
    expect(ok.issuer.rut).toBe('76795561-8');
    expect(() => BillingConfigInput.parse({ enabled: true, live: false, issuer: { ...issuer, rut: '76.795.561-9' } })).toThrow();
  });
});

// ─── Servicio con una base simulada ──────────────────────────────────

const owner: StoreAccess = { id: 's1', slug: 'norte', role: 'OWNER' };

const paidOrder = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  storeId: 's1',
  number: 1001,
  status: 'PAID',
  subtotal: 20000,
  shippingTotal: 3500,
  discountTotal: 0,
  total: 23500,
  shippingAddress: { name: 'Ana Pérez', rut: '11.111.111-1' },
  items: [{ name: 'Polera', quantity: 2, unitPrice: 10000 }],
  payments: [{ raw: {} }],
  dte: null,
  ...over,
});

function fakeDb(order: ReturnType<typeof paidOrder> | null, config: Record<string, unknown> | null) {
  let row: Record<string, unknown> | null = null;
  const db = {
    order: { findFirst: vi.fn().mockResolvedValue(order) },
    billingConfig: { findUnique: vi.fn().mockResolvedValue(config), upsert: vi.fn() },
    dte: {
      create: vi.fn().mockImplementation(({ data }) => (row = { id: 'd1', attempts: 0, folio: null, token: null, error: null, createdAt: new Date(), ...data })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockImplementation(() => row),
      update: vi.fn().mockImplementation(({ data }) => {
        const attempts = data.attempts?.increment ? (row!.attempts as number) + 1 : row!.attempts;
        return (row = { ...row, ...data, attempts });
      }),
      findFirst: vi.fn(),
    },
  };
  return { db, service: new BillingService({ client: db } as unknown as PrismaService) };
}

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('BillingService', () => {
  it('sin boletas activadas no hace nada (y no rompe la confirmación del pago)', async () => {
    const { service, db } = fakeDb(paidOrder(), null);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await service.afterPaid('o1', false);
    expect(fetch).not.toHaveBeenCalled();
    expect(db.dte.create).not.toHaveBeenCalled();
  });

  it('en modo de prueba sin llave propia emite con la llave y el emisor de prueba de OpenFactura', async () => {
    const { service, db } = fakeDb(paidOrder(), { enabled: true, live: false, exempt: false, issuer: {}, apiKeyEnc: null });
    const fetch = vi.fn().mockResolvedValue(ok({ TOKEN: 'tok1', FOLIO: 77 }));
    vi.stubGlobal('fetch', fetch);
    const r = await service.issueForOrder('o1', { manual: true });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://dev-api.haulmer.com/v2/dte/document');
    expect(init.headers.apikey).toBe(OPENFACTURA_DEMO_KEY);
    expect(init.headers['Idempotency-Key']).toBe('d1-0');
    const body = JSON.parse(init.body);
    expect(body.dte.Encabezado.Emisor.RUTEmisor).toBe('76795561-8');
    // El cliente dio su RUT: va como receptor.
    expect(body.dte.Encabezado.Receptor).toEqual({ RUTRecep: '11111111-1', RznSocRecep: 'Ana Pérez' });
    expect(body.dte.Encabezado.Totales).toEqual({ MntNeto: 19748, IVA: 3752, MntTotal: 23500 });
    expect(db.dte.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'o1', status: 'ISSUING', test: true, type: 39, receiverRut: '11111111-1' }) });
    expect(r).toMatchObject({ status: 'ISSUED', folio: 77, test: true });
  });

  it('de verdad usa la llave y el emisor de la tienda, y nunca emite por un pago de prueba', async () => {
    const config = { enabled: true, live: true, exempt: false, issuer, apiKeyEnc: encrypt('mi-llave-de-openfactura') };
    const { service, db } = fakeDb(paidOrder({ payments: [{ raw: { test: true } }] }), config);
    const fetch = vi.fn().mockResolvedValue(ok({ TOKEN: 'tok', FOLIO: 1 }));
    vi.stubGlobal('fetch', fetch);
    await service.afterPaid('o1', true);
    expect(fetch).not.toHaveBeenCalled();
    await expect(service.issueForOrder('o1', { manual: true })).rejects.toBeInstanceOf(BadRequestException);

    db.order.findFirst.mockResolvedValue(paidOrder({ shippingAddress: { name: 'Ana' } }));
    await service.afterPaid('o1', false);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.haulmer.com/v2/dte/document');
    expect(init.headers.apikey).toBe('mi-llave-de-openfactura');
    const body = JSON.parse(init.body);
    expect(body.dte.Encabezado.Emisor.RUTEmisor).toBe('76123456-0');
    // Sin RUT del cliente: consumidor final.
    expect(body.dte.Encabezado.Receptor).toEqual({ RUTRecep: '66666666-6' });
  });

  it('un rechazo queda con error para reintentar, y el reintento cambia la llave', async () => {
    const { service, db } = fakeDb(paidOrder(), { enabled: true, live: false, exempt: false, issuer: {}, apiKeyEnc: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ error: { message: 'Giro inválido', code: 'OF-10' } }, 400)));
    const r = await service.issueForOrder('o1', { manual: true });
    expect(r).toMatchObject({ status: 'FAILED', error: 'Giro inválido' });

    const failed = db.dte.findUniqueOrThrow();
    db.order.findFirst.mockResolvedValue(paidOrder({ dte: failed }));
    const fetch = vi.fn().mockResolvedValue(ok({ TOKEN: 'tok', FOLIO: 5 }));
    vi.stubGlobal('fetch', fetch);
    const again = await service.issueForOrder('o1', { manual: true });
    expect(db.dte.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'd1' }) }));
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('d1-1');
    expect(again).toMatchObject({ status: 'ISSUED', folio: 5 });
  });

  it('si se cortó la conexión, el reintento usa la misma llave y recupera la boleta ya emitida', async () => {
    const { service, db } = fakeDb(paidOrder(), { enabled: true, live: false, exempt: false, issuer: {}, apiKeyEnc: null });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    expect(await service.issueForOrder('o1', { manual: false })).toMatchObject({ status: 'FAILED' });

    db.order.findFirst.mockResolvedValue(paidOrder({ dte: db.dte.findUniqueOrThrow() }));
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(ok({ error: { message: 'Idempotency-Key ya usada', code: 'OF-06', details: { token: 'tokX' } } }, 400))
      .mockResolvedValueOnce(ok({ pdf: Buffer.from('%PDF').toString('base64'), folio: 99 }));
    vi.stubGlobal('fetch', fetch);
    const r = await service.issueForOrder('o1', { manual: true });
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('d1-0');
    expect(fetch.mock.calls[1][0]).toBe('https://dev-api.haulmer.com/v2/dte/document/tokX/pdf');
    expect(r).toMatchObject({ status: 'ISSUED', folio: 99 });
  });

  it('una boleta ya emitida no se emite de nuevo, ni un pedido sin pagar', async () => {
    const issued = { id: 'd1', status: 'ISSUED', folio: 3, issueDate: null, createdAt: new Date() };
    const { service, db } = fakeDb(paidOrder({ dte: issued }), { enabled: true, live: false, exempt: false, issuer: {}, apiKeyEnc: null });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await service.issueForOrder('o1', { manual: true })).toMatchObject({ status: 'ISSUED', folio: 3 });
    db.order.findFirst.mockResolvedValue(paidOrder({ status: 'PENDING' }));
    await expect(service.issueForOrder('o1', { manual: true })).rejects.toThrow('pagado');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('el PDF para el comprador exige la llave del pedido', async () => {
    const { service, db } = fakeDb(null, { enabled: true, live: false, exempt: false, issuer: {}, apiKeyEnc: null });
    await expect(service.publicPdf('norte', 'o1', 'mala')).rejects.toBeInstanceOf(NotFoundException);
    db.dte.findFirst.mockResolvedValue({ id: 'd1', storeId: 's1', status: 'ISSUED', token: 'tok', test: true, folio: 8 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ pdf: Buffer.from('%PDF-1.4').toString('base64'), folio: 8 })));
    const r = await service.publicPdf('norte', 'o1', orderKey('o1'));
    expect(r.pdf.toString()).toBe('%PDF-1.4');
    expect(r.folio).toBe(8);
  });

  it('para emitir de verdad pide la API key y los datos del emisor', async () => {
    const { service } = fakeDb(null, null);
    await expect(service.setConfig(owner, BillingConfigInput.parse({ enabled: true, live: true, apiKey: '', issuer }))).rejects.toThrow('API key');
    await expect(
      service.setConfig(owner, BillingConfigInput.parse({ enabled: true, live: true, apiKey: 'abcdefghijklmnop1234', issuer: { ...issuer, activity: '' } })),
    ).rejects.toThrow('giro');
    await expect(service.setConfig({ ...owner, role: 'STAFF' }, BillingConfigInput.parse({ enabled: false, live: false, issuer }))).rejects.toThrow('Solo dueños');
  });
});
