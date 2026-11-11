import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PaymentProvider } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { decrypt, encrypt, orderKey, verifyOrderKey } from '../integrations/crypto.js';
import { WEBPAY_TEST, webpay, webpayApproved, type WebpayCommit, type WebpayCreds } from './gateways/webpay.js';
import { mercadopago, type MpPayment } from './gateways/mercadopago.js';
import type { CheckoutInput, Method } from './orders.schemas.js';
import type { z } from 'zod';
import type { MercadoPagoConfig, OrderPatch, TransferConfig, WebpayConfig } from './orders.schemas.js';

// Mismos valores por defecto que la tienda de muestra (apps/web/src/designs/catalog.ts).
const SHIPPING_DEFAULTS = { shippingRM: 3500, shippingRegions: 5990, freeShippingFrom: 60000 };
// Webpay no acepta montos bajo $50.
const MIN_TOTAL = 50;

const PROVIDER: Record<Method, PaymentProvider> = { webpay: 'WEBPAY', mercadopago: 'MERCADOPAGO', transfer: 'TRANSFER' };
const METHOD: Record<string, Method> = { WEBPAY: 'webpay', MERCADOPAGO: 'mercadopago', TRANSFER: 'transfer' };

export type TransferDetails = { bank: string; accountType: string; accountNumber: string; holder: string; rut: string; email: string };
type Gateway = { provider: PaymentProvider; enabled: boolean; live: boolean; config: Prisma.JsonValue; secretEnc: string | null };
export type Redirect = { url: string; method: 'GET' } | { url: string; method: 'POST'; fields: Record<string, string> } | null;

export type Totals = { subtotal: number; discountTotal: number; shippingTotal: number; total: number; freeShippingByCode: boolean };

// Totales del pedido. El envío se calcula sobre lo que queda después del descuento,
// igual que el carrito: gratis desde `freeShippingFrom` o con un código de envío gratis.
export function computeTotals(
  subtotal: number,
  region: string,
  shipping: { shippingRM: number; shippingRegions: number; freeShippingFrom: number },
  code: { kind: 'PERCENT' | 'FREE_SHIPPING'; percent: number } | null,
): Totals {
  const discountTotal = code?.kind === 'PERCENT' ? Math.round((subtotal * code.percent) / 100) : 0;
  const after = subtotal - discountTotal;
  const freeShippingByCode = code?.kind === 'FREE_SHIPPING';
  const base = after >= shipping.freeShippingFrom ? 0 : region === 'Metropolitana' ? shipping.shippingRM : shipping.shippingRegions;
  const shippingTotal = freeShippingByCode ? 0 : base;
  return { subtotal, discountTotal, shippingTotal, total: after + shippingTotal, freeShippingByCode };
}

// La tienda manda su propia dirección para volver después de pagar. Solo https (o la
// máquina local en desarrollo).
export function safeOrigin(origin: string) {
  const u = new URL(origin);
  const local = u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname);
  if (u.protocol !== 'https:' && !local) throw new BadRequestException('Dirección de la tienda inválida');
  return u.origin;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  // ─── Medios de pago ────────────────────────────────────────────────

  private async gateways(storeId: string) {
    const rows = await this.db.paymentGateway.findMany({ where: { storeId } });
    return new Map(rows.map((g) => [g.provider, g as Gateway]));
  }

  private webpayCreds(g: Gateway | undefined): WebpayCreds | null {
    if (!g?.enabled) return null;
    if (!g.live) return { ...WEBPAY_TEST, live: false };
    const commerceCode = (g.config as { commerceCode?: string })?.commerceCode;
    if (!commerceCode || !g.secretEnc) return null;
    return { commerceCode, apiKey: decrypt(g.secretEnc), live: true };
  }

  private mpToken(g: Gateway | undefined) {
    return g?.enabled && g.secretEnc ? decrypt(g.secretEnc) : null;
  }

  private transfer(g: Gateway | undefined): TransferDetails | null {
    const c = g?.config as Partial<TransferDetails> | undefined;
    return g?.enabled && c?.accountNumber ? (c as TransferDetails) : null;
  }

  private available(gw: Map<PaymentProvider, Gateway>) {
    return {
      webpay: Boolean(this.webpayCreds(gw.get('WEBPAY'))),
      mercadopago: Boolean(gw.get('MERCADOPAGO')?.enabled && gw.get('MERCADOPAGO')?.secretEnc),
      transfer: Boolean(this.transfer(gw.get('TRANSFER'))),
      // En prueba no se cobra de verdad: la tienda lo avisa.
      test: [gw.get('WEBPAY')].some((g) => g?.enabled && !g.live) || this.mpTest(gw.get('MERCADOPAGO')),
    };
  }

  private mpTest(g: Gateway | undefined) {
    return Boolean(g?.enabled && (g.config as { test?: boolean })?.test);
  }

  async methods(slug: string) {
    const store = await this.storeBySlug(slug);
    return this.available(await this.gateways(store.id));
  }

  private async storeBySlug(slug: string) {
    const store = await this.db.store.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, settings: true } });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return store;
  }

  // ─── Checkout ──────────────────────────────────────────────────────

  async checkout(slug: string, input: CheckoutInput) {
    const origin = safeOrigin(input.origin);
    const store = await this.storeBySlug(slug);
    const gw = await this.gateways(store.id);
    if (!this.available(gw)[input.method]) throw new BadRequestException('Ese medio de pago no está disponible. Elige otro.');

    // Precios y stock desde la base, nunca desde el navegador.
    const qty = new Map<string, number>();
    for (const i of input.items) qty.set(i.variantId, (qty.get(i.variantId) ?? 0) + i.qty);
    const variants = await this.db.productVariant.findMany({
      where: { id: { in: [...qty.keys()] }, product: { storeId: store.id, status: 'ACTIVE' } },
      select: { id: true, sku: true, name: true, price: true, stock: true, options: true, product: { select: { name: true } } },
    });
    if (variants.length !== qty.size) throw new ConflictException('Un producto de tu carrito ya no está disponible. Revisa el carrito y vuelve a intentar.');
    const lines = variants.map((v) => {
      const n = qty.get(v.id)!;
      if (v.stock < n) throw new ConflictException(v.stock > 0 ? `Solo quedan ${v.stock} de ${v.product.name} en esa talla y color.` : `${v.product.name} se agotó en esa talla y color.`);
      const opts = Object.values((v.options ?? {}) as Record<string, string>).filter(Boolean).join(' · ');
      return { variantId: v.id, sku: v.sku, name: opts ? `${v.product.name} (${opts})` : v.product.name, unitPrice: v.price, quantity: n };
    });
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    const code = input.code ? await this.validCode(store.id, input.code, subtotal) : null;
    const s = (store.settings ?? {}) as Partial<typeof SHIPPING_DEFAULTS>;
    const shipping = {
      shippingRM: s.shippingRM ?? SHIPPING_DEFAULTS.shippingRM,
      shippingRegions: s.shippingRegions ?? SHIPPING_DEFAULTS.shippingRegions,
      freeShippingFrom: s.freeShippingFrom ?? SHIPPING_DEFAULTS.freeShippingFrom,
    };
    const totals = computeTotals(subtotal, input.address.region, shipping, code);
    if (totals.total < MIN_TOTAL) throw new BadRequestException('El total es muy bajo para pagar en línea.');

    const address = { name: input.name, phone: input.phone, rut: input.rut || null, ...input.address, apartment: input.address.apartment || null };
    const order = await this.createOrder(store.id, {
      email: input.email,
      customer: { name: input.name, phone: input.phone, rut: input.rut || null },
      address,
      notes: input.notes || null,
      code: code?.code ?? null,
      lines,
      totals,
    });
    const redirect = await this.startPayment(store, gw, order, input.method, origin);
    return { orderId: order.id, number: order.number, key: orderKey(order.id), total: order.total, redirect };
  }

  private async validCode(storeId: string, raw: string, subtotal: number) {
    const d = await this.db.discountCode.findFirst({
      where: { storeId, code: raw, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { code: true, kind: true, percent: true, minSubtotal: true, maxUses: true, usedCount: true },
    });
    if (!d || (d.maxUses !== null && d.usedCount >= d.maxUses)) throw new BadRequestException(`El código ${raw} ya no está disponible. Quítalo para seguir.`);
    if (subtotal < d.minSubtotal) throw new BadRequestException(`El código ${raw} pide una compra mínima de $${d.minSubtotal.toLocaleString('es-CL')} en productos.`);
    return d;
  }

  // Número correlativo por tienda: si dos pedidos toman el mismo número a la vez, el
  // índice único rechaza uno y se reintenta con el siguiente.
  private async createOrder(
    storeId: string,
    o: {
      email: string;
      customer: { name: string; phone: string; rut: string | null };
      address: Record<string, unknown>;
      notes: string | null;
      code: string | null;
      lines: { variantId: string; sku: string | null; name: string; unitPrice: number; quantity: number }[];
      totals: Totals;
    },
  ) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          const customer = await tx.customer.upsert({
            where: { storeId_email: { storeId, email: o.email } },
            create: { storeId, email: o.email, ...o.customer },
            update: o.customer,
            select: { id: true },
          });
          const last = await tx.order.aggregate({ where: { storeId }, _max: { number: true } });
          return tx.order.create({
            data: {
              storeId,
              number: (last._max.number ?? 1000) + 1,
              customerId: customer.id,
              email: o.email,
              subtotal: o.totals.subtotal,
              discountTotal: o.totals.discountTotal,
              shippingTotal: o.totals.shippingTotal,
              total: o.totals.total,
              discountCode: o.code,
              shippingAddress: o.address as Prisma.InputJsonObject,
              notes: o.notes,
              items: { create: o.lines },
            },
            select: { id: true, number: true, total: true, email: true },
          });
        });
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  private async startPayment(
    store: { id: string; slug: string; name: string },
    gw: Map<PaymentProvider, Gateway>,
    order: { id: string; number: number; total: number; email: string },
    method: Method,
    origin: string,
  ): Promise<Redirect> {
    const payment = await this.db.payment.create({ data: { orderId: order.id, provider: PROVIDER[method], amount: order.total }, select: { id: true } });
    try {
      if (method === 'webpay') {
        const creds = this.webpayCreds(gw.get('WEBPAY'))!;
        const r = await webpay.create(creds, { buyOrder: order.id, sessionId: payment.id, amount: order.total, returnUrl: `${origin}/pago/webpay?o=${order.id}` });
        await this.db.payment.update({ where: { id: payment.id }, data: { externalId: r.token } });
        return { url: r.url, method: 'POST', fields: { token_ws: r.token } };
      }
      if (method === 'mercadopago') {
        const token = this.mpToken(gw.get('MERCADOPAGO'))!;
        const https = origin.startsWith('https://');
        const pref = await mercadopago.createPreference(token, {
          orderId: order.id,
          paymentId: payment.id,
          title: `Pedido #${order.number} en ${store.name}`,
          amount: order.total,
          email: order.email,
          returnUrl: `${origin}/pago/mercadopago?o=${order.id}`,
          // Mercado Pago solo avisa a direcciones https públicas.
          notificationUrl: https ? `${origin}/pago/mercadopago/aviso?o=${order.id}` : '',
        });
        await this.db.payment.update({ where: { id: payment.id }, data: { externalId: pref.id } });
        return { url: this.mpTest(gw.get('MERCADOPAGO')) && pref.sandbox_init_point ? pref.sandbox_init_point : pref.init_point, method: 'GET' };
      }
      // Transferencia: el dueño la confirma en el panel cuando ve el depósito.
      return null;
    } catch (e) {
      await this.db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', raw: { error: 'start' } } });
      throw e;
    }
  }

  // Reintentar el pago de un pedido pendiente (otro medio o la misma pasarela).
  async pay(slug: string, orderId: string, key: string, method: Method, rawOrigin: string) {
    const origin = safeOrigin(rawOrigin);
    const order = await this.orderForBuyer(slug, orderId, key);
    if (order.status !== 'PENDING') throw new ConflictException('Este pedido ya no está pendiente de pago.');
    const store = await this.storeBySlug(slug);
    const gw = await this.gateways(store.id);
    if (!this.available(gw)[method]) throw new BadRequestException('Ese medio de pago no está disponible. Elige otro.');
    const redirect = await this.startPayment(store, gw, order, method, origin);
    return { orderId: order.id, number: order.number, key, total: order.total, redirect };
  }

  // ─── Confirmación ──────────────────────────────────────────────────

  // Pedido pagado: se marca una sola vez (aunque Webpay o Mercado Pago avisen dos
  // veces), se descuenta el stock y se registra el uso del código, todo junto.
  async markPaid(orderId: string, paymentId: string, raw: Prisma.InputJsonValue) {
    return this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { status: true, orderId: true } });
      if (payment.orderId !== orderId) throw new BadRequestException('Pago de otro pedido');
      if (payment.status === 'AUTHORIZED') return false;
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'AUTHORIZED', raw } });
      const changed = await tx.order.updateMany({ where: { id: orderId, status: { in: ['PENDING', 'CANCELLED'] } }, data: { status: 'PAID' } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
      const issues: string[] = [];
      if (!changed.count) {
        issues.push('Llegó un segundo pago aprobado para este pedido. Revisa si corresponde devolverlo.');
      } else {
        for (const it of order.items) {
          if (!it.variantId) continue;
          const n = await tx.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" - ${it.quantity} WHERE "id" = ${it.variantId} AND "stock" >= ${it.quantity}`;
          if (!n) issues.push(`No quedaba stock suficiente de ${it.name} al confirmarse el pago.`);
        }
        if (order.discountCode) {
          const rows = await tx.$queryRaw<{ id: string }[]>`
            UPDATE "DiscountCode" SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
            WHERE "storeId" = ${order.storeId} AND "code" = ${order.discountCode}
              AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
            RETURNING "id"`;
          if (!rows.length) issues.push(`El código ${order.discountCode} ya no tenía usos disponibles al confirmarse el pago.`);
        }
      }
      if (issues.length) await tx.order.update({ where: { id: orderId }, data: { notes: [order.notes, ...issues.map((i) => `⚠ ${i}`)].filter(Boolean).join('\n') } });
      return true;
    });
  }

  private markFailed(paymentId: string, raw: Prisma.InputJsonValue) {
    return this.db.payment.updateMany({ where: { id: paymentId, status: 'PENDING' }, data: { status: 'FAILED', raw } });
  }

  private async orderInStore(slug: string, orderId: string) {
    const order = await this.db.order.findFirst({
      where: { id: orderId, store: { slug } },
      include: { payments: { orderBy: { createdAt: 'desc' } }, store: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async webpayReturn(slug: string, input: { order: string; token_ws?: string; TBK_TOKEN?: string }) {
    const order = await this.orderInStore(slug, input.order);
    const result = { orderId: order.id, key: orderKey(order.id) };
    const webpays = order.payments.filter((p) => p.provider === 'WEBPAY');

    if (input.token_ws && !input.TBK_TOKEN) {
      const payment = webpays.find((p) => p.externalId === input.token_ws);
      if (!payment || payment.status !== 'PENDING') return result;
      const creds = this.webpayCreds((await this.gateways(order.store.id)).get('WEBPAY'));
      if (!creds) return result;
      let r: WebpayCommit;
      try {
        r = await webpay.commit(creds, input.token_ws);
      } catch {
        // Si ya se había confirmado (el cliente recargó la página), la consulta trae el resultado.
        try {
          r = await webpay.status(creds, input.token_ws);
        } catch {
          return result;
        }
      }
      const raw = {
        status: r.status,
        responseCode: r.response_code,
        authorizationCode: r.authorization_code ?? null,
        paymentType: r.payment_type_code ?? null,
        installments: r.installments_number ?? 0,
        card: r.card_detail?.card_number ?? null,
        date: r.transaction_date ?? null,
      };
      const matches = r.buy_order === order.id && r.session_id === payment.id && r.amount === payment.amount;
      if (webpayApproved(r) && matches) await this.markPaid(order.id, payment.id, raw);
      else await this.markFailed(payment.id, { ...raw, mismatch: !matches });
      return result;
    }

    // El cliente anuló el pago en Webpay o se le acabó el tiempo.
    const payment = input.TBK_TOKEN ? webpays.find((p) => p.externalId === input.TBK_TOKEN) : webpays.find((p) => p.status === 'PENDING');
    if (payment) await this.markFailed(payment.id, { aborted: true });
    return result;
  }

  // Vuelta desde Mercado Pago o su aviso automático: se consulta el pago allá.
  async mercadopagoCheck(slug: string, orderId: string, mpPaymentId?: string) {
    const order = await this.orderInStore(slug, orderId);
    const result = { orderId: order.id, key: orderKey(order.id) };
    if (!mpPaymentId) return result;
    const token = this.mpToken((await this.gateways(order.store.id)).get('MERCADOPAGO'));
    if (!token) return result;
    const mp: MpPayment = await mercadopago.payment(token, mpPaymentId);
    if (mp.external_reference !== order.id) return result;
    const ours = order.payments.filter((p) => p.provider === 'MERCADOPAGO');
    const already = ours.find((p) => (p.raw as { mpId?: string } | null)?.mpId === String(mp.id));
    const payment = already ?? ours.find((p) => p.status === 'PENDING');
    if (!payment) return result;
    const raw = { mpId: String(mp.id), status: mp.status, detail: mp.status_detail ?? null, type: mp.payment_type_id ?? null, installments: mp.installments ?? 0 };
    if (mp.status === 'approved' && mp.transaction_amount === payment.amount && (mp.currency_id ?? 'CLP') === 'CLP') await this.markPaid(order.id, payment.id, raw);
    else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mp.status)) await this.markFailed(payment.id, raw);
    else await this.db.payment.update({ where: { id: payment.id }, data: { raw } });
    return result;
  }

  // ─── Lo que ve el comprador ────────────────────────────────────────

  private async orderForBuyer(slug: string, orderId: string, key: string) {
    if (!verifyOrderKey(orderId, key)) throw new NotFoundException('Pedido no encontrado');
    return this.orderInStore(slug, orderId);
  }

  async publicOrder(slug: string, orderId: string, key: string) {
    const order = await this.orderForBuyer(slug, orderId, key);
    const items = await this.db.orderItem.findMany({ where: { orderId }, select: { variantId: true, name: true, unitPrice: true, quantity: true } });
    const gw = await this.gateways(order.store.id);
    const last = order.payments[0];
    const a = order.shippingAddress as { name?: string; comuna?: string; region?: string; street?: string; number?: string; apartment?: string | null };
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      createdAt: order.createdAt,
      email: order.email,
      items,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      discountCode: order.discountCode,
      shippingTotal: order.shippingTotal,
      total: order.total,
      address: { name: a.name, line: [a.street, a.number, a.apartment].filter(Boolean).join(' '), comuna: a.comuna, region: a.region },
      payment: last ? { method: METHOD[last.provider], status: last.status, pending: last.status === 'PENDING' && last.provider !== 'TRANSFER' } : null,
      // Datos para transferir mientras el pedido espera el depósito.
      transfer: order.status === 'PENDING' && last?.provider === 'TRANSFER' ? this.transfer(gw.get('TRANSFER')) : null,
      methods: order.status === 'PENDING' ? this.available(gw) : null,
    };
  }

  // ─── Panel ─────────────────────────────────────────────────────────

  private assertManager(access: StoreAccess) {
    if (access.role === 'STAFF') throw new ForbiddenException('Solo dueños y administradores pueden hacer esto');
  }

  async list(access: StoreAccess, status?: string) {
    const where: Prisma.OrderWhereInput = { storeId: access.id };
    if (status && ['PENDING', 'PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status)) where.status = status as Prisma.OrderWhereInput['status'];
    const orders = await this.db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        items: { select: { name: true, sku: true, unitPrice: true, quantity: true } },
        payments: { orderBy: { createdAt: 'desc' }, select: { provider: true, status: true, amount: true, raw: true, createdAt: true } },
        shipments: { orderBy: { createdAt: 'desc' }, select: { carrier: true, trackingNumber: true, status: true } },
      },
    });
    return orders.map((o) => ({ ...o, payments: o.payments.map((p) => ({ ...p, method: METHOD[p.provider] })) }));
  }

  async update(access: StoreAccess, id: string, patch: z.infer<typeof OrderPatch>) {
    const order = await this.db.order.findFirst({ where: { id, storeId: access.id }, include: { payments: { orderBy: { createdAt: 'desc' } } } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    const to = patch.status;
    if (to === 'PAID') {
      this.assertManager(access);
      if (order.status !== 'PENDING') throw new ConflictException('Solo un pedido pendiente se puede marcar como pagado.');
      const pending = order.payments.find((p) => p.status === 'PENDING' && p.provider === 'TRANSFER');
      const paymentId = pending?.id ?? (await this.db.payment.create({ data: { orderId: id, provider: 'TRANSFER', amount: order.total }, select: { id: true } })).id;
      await this.markPaid(id, paymentId, { manual: true, at: new Date().toISOString() });
    } else if (to === 'CANCELLED') {
      this.assertManager(access);
      if (order.status !== 'PENDING') throw new ConflictException('Solo se puede anular un pedido que aún no está pagado. Si ya se pagó, devuelve el dinero desde la pasarela.');
      await this.db.order.update({ where: { id }, data: { status: 'CANCELLED' } });
    } else if (to === 'FULFILLED') {
      if (order.status !== 'PAID') throw new ConflictException('Solo un pedido pagado se puede marcar como despachado.');
      await this.db.$transaction([
        this.db.order.update({ where: { id }, data: { status: 'FULFILLED' } }),
        this.db.shipment.create({ data: { orderId: id, carrier: patch.carrier || 'otro', trackingNumber: patch.trackingNumber || null, cost: order.shippingTotal, status: 'IN_TRANSIT' } }),
      ]);
    } else if (to === 'DELIVERED') {
      if (order.status !== 'FULFILLED') throw new ConflictException('Solo un pedido despachado se puede marcar como entregado.');
      await this.db.$transaction([
        this.db.order.update({ where: { id }, data: { status: 'DELIVERED' } }),
        this.db.shipment.updateMany({ where: { orderId: id }, data: { status: 'DELIVERED' } }),
      ]);
    }
    return (await this.list(access)).find((o) => o.id === id);
  }

  async gatewayConfig(access: StoreAccess) {
    const gw = await this.gateways(access.id);
    const w = gw.get('WEBPAY');
    const m = gw.get('MERCADOPAGO');
    const t = gw.get('TRANSFER');
    return {
      webpay: { enabled: Boolean(w?.enabled), live: Boolean(w?.live), commerceCode: (w?.config as { commerceCode?: string })?.commerceCode ?? '', hasKey: Boolean(w?.secretEnc) },
      mercadopago: { enabled: Boolean(m?.enabled), hasToken: Boolean(m?.secretEnc), test: this.mpTest(m) },
      transfer: { enabled: Boolean(t?.enabled), bank: '', accountType: '', accountNumber: '', holder: '', rut: '', email: '', ...(t?.config as object) },
    };
  }

  private upsertGateway(storeId: string, provider: PaymentProvider, data: { enabled: boolean; live?: boolean; config?: Prisma.InputJsonObject; secretEnc?: string }) {
    return this.db.paymentGateway.upsert({ where: { storeId_provider: { storeId, provider } }, create: { storeId, provider, ...data }, update: data });
  }

  async setWebpay(access: StoreAccess, c: z.infer<typeof WebpayConfig>) {
    this.assertManager(access);
    const prev = (await this.gateways(access.id)).get('WEBPAY');
    if (c.enabled && c.live && (!c.commerceCode || !(c.apiKey || prev?.secretEnc))) {
      throw new BadRequestException('Para cobrar de verdad escribe el código de comercio y la llave secreta que te entregó Transbank.');
    }
    await this.upsertGateway(access.id, 'WEBPAY', { enabled: c.enabled, live: c.live, config: { commerceCode: c.commerceCode }, ...(c.apiKey ? { secretEnc: encrypt(c.apiKey) } : {}) });
    return this.gatewayConfig(access);
  }

  async setMercadoPago(access: StoreAccess, c: z.infer<typeof MercadoPagoConfig>) {
    this.assertManager(access);
    const prev = (await this.gateways(access.id)).get('MERCADOPAGO');
    if (c.enabled && !(c.accessToken || prev?.secretEnc)) throw new BadRequestException('Pega el access token de tu cuenta de Mercado Pago.');
    const config = c.accessToken ? { test: c.accessToken.startsWith('TEST-') } : ((prev?.config as Prisma.InputJsonObject) ?? {});
    await this.upsertGateway(access.id, 'MERCADOPAGO', { enabled: c.enabled, config, ...(c.accessToken ? { secretEnc: encrypt(c.accessToken) } : {}) });
    return this.gatewayConfig(access);
  }

  async setTransfer(access: StoreAccess, c: z.infer<typeof TransferConfig>) {
    this.assertManager(access);
    const { enabled, ...details } = c;
    if (enabled && (!details.bank || !details.accountNumber || !details.holder || !details.rut)) {
      throw new BadRequestException('Completa banco, número de cuenta, titular y RUT para recibir transferencias.');
    }
    await this.upsertGateway(access.id, 'TRANSFER', { enabled, config: details });
    return this.gatewayConfig(access);
  }
}
