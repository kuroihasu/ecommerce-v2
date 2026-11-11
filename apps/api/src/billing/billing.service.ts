import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Dte } from '@tienda/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';
import { decrypt, encrypt, verifyOrderKey } from '../integrations/crypto.js';
import { chileDay } from '../accounting/period.js';
import { BOLETA, BOLETA_EXENTA, amountsOf, buildBoleta, type DteType, type Issuer } from './dte.js';
import { DteProviderError, OPENFACTURA_DEMO_ISSUER, OPENFACTURA_DEMO_KEY, openfactura, type OpenFacturaCreds } from './openfactura.js';
import { GENERIC_RUT, normalizeRut } from './rut.js';
import type { BillingConfigInput } from './billing.schemas.js';

// Pedidos que llevan boleta: los pagados (y los que siguieron a despachado o entregado).
const SOLD = ['PAID', 'FULFILLED', 'DELIVERED'] as const;
// Un envío que quedó "emitiéndose" más de esto (la función se cortó) se puede reintentar.
const STALE_MS = 2 * 60_000;

type Config = { enabled: boolean; live: boolean; exempt: boolean; issuer: Prisma.JsonValue; apiKeyEnc: string | null };
type Creds = OpenFacturaCreds & { issuer: Issuer; type: DteType };

const issuerOf = (json: Prisma.JsonValue): Partial<Issuer> => (json && typeof json === 'object' && !Array.isArray(json) ? (json as Partial<Issuer>) : {});
const issuerComplete = (i: Partial<Issuer>): i is Issuer => Boolean(i.rut && i.name && i.activity && i.address && i.comuna);

const dteOut = (d: Dte) => ({
  id: d.id,
  orderId: d.orderId,
  type: d.type,
  folio: d.folio,
  status: d.status,
  test: d.test,
  total: d.total,
  netAmount: d.netAmount,
  taxAmount: d.taxAmount,
  exemptAmount: d.exemptAmount,
  receiverRut: d.receiverRut,
  issueDate: d.issueDate ? d.issueDate.toISOString().slice(0, 10) : null,
  error: d.error,
  createdAt: d.createdAt,
});
export type DteOut = ReturnType<typeof dteOut>;

// Boletas electrónicas: se emiten solas al confirmarse el pago de un pedido (ver
// OrdersService.markPaid) a través de OpenFactura, que las firma y las envía al SII.
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  private assertManager(access: StoreAccess) {
    if (access.role === 'STAFF') throw new ForbiddenException('Solo dueños y administradores pueden hacer esto');
  }

  private config(storeId: string): Promise<Config | null> {
    return this.db.billingConfig.findUnique({ where: { storeId }, select: { enabled: true, live: true, exempt: true, issuer: true, apiKeyEnc: true } });
  }

  // Con qué se emite. En prueba, sin API key propia, se usa la de prueba pública de
  // OpenFactura con su emisor de prueba (es el único emisor que esa llave acepta).
  creds(c: Config | null): Creds | null {
    if (!c?.enabled) return null;
    const type = c.exempt ? BOLETA_EXENTA : BOLETA;
    const issuer = issuerOf(c.issuer);
    if (c.live) {
      if (!c.apiKeyEnc || !issuerComplete(issuer)) return null;
      return { apiKey: decrypt(c.apiKeyEnc), live: true, issuer, type };
    }
    if (c.apiKeyEnc && issuerComplete(issuer)) return { apiKey: decrypt(c.apiKeyEnc), live: false, issuer, type };
    return { apiKey: OPENFACTURA_DEMO_KEY, live: false, issuer: OPENFACTURA_DEMO_ISSUER, type };
  }

  // ─── Emisión ───────────────────────────────────────────────────────

  // Después de confirmar un pago. Nunca falla: si la boleta no sale, queda "con error" en
  // el panel para reintentarla, y el pago sigue confirmado.
  //
  // `testPayment`: el pago se hizo en el ambiente de prueba de la pasarela. Con boletas de
  // verdad no se emite (sería una boleta real de una venta que no existió).
  async afterPaid(orderId: string, testPayment: boolean) {
    try {
      await this.issueForOrder(orderId, { testPayment, manual: false });
    } catch (e) {
      console.error('[billing] no se pudo emitir la boleta del pedido', orderId, e instanceof Error ? e.message : e);
    }
  }

  // Emite (o reintenta) la boleta de un pedido pagado. Una sola por pedido aunque se
  // llame dos veces a la vez: la fila se reserva primero (orderId único) y el proveedor
  // recibe una llave de idempotencia por si la respuesta se pierde en el camino.
  async issueForOrder(orderId: string, opts: { testPayment?: boolean; manual: boolean; storeId?: string }): Promise<DteOut | null> {
    const fail = (msg: string) => {
      if (opts.manual) throw new BadRequestException(msg);
      return null;
    };
    const order = await this.db.order.findFirst({
      where: { id: orderId, ...(opts.storeId ? { storeId: opts.storeId } : {}) },
      include: { items: true, dte: true, payments: { where: { status: 'AUTHORIZED' }, select: { raw: true } } },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (!(SOLD as readonly string[]).includes(order.status)) return fail('Solo un pedido pagado lleva boleta.');
    const creds = this.creds(await this.config(order.storeId));
    if (!creds) return fail('Activa y completa las boletas en Panel → Boletas.');
    const testPayment = opts.testPayment ?? order.payments.some((p) => (p.raw as { test?: boolean } | null)?.test);
    if (testPayment && creds.live) return fail('Este pedido se pagó en modo de prueba: no lleva boleta real.');

    let dte = order.dte;
    if (dte?.status === 'ISSUED') return dteOut(dte);

    const a = order.shippingAddress as { name?: string; rut?: string | null };
    const rut = normalizeRut(a.rut) ?? GENERIC_RUT;
    const amounts = amountsOf(creds.type, order.total);
    const issueDate = chileDay(new Date());
    const fields = {
      type: creds.type,
      test: !creds.live,
      provider: 'openfactura',
      total: amounts.total,
      netAmount: amounts.net,
      taxAmount: amounts.tax,
      exemptAmount: amounts.exempt,
      receiverRut: rut,
      issueDate: new Date(`${issueDate}T00:00:00Z`),
    };

    // Reservar la emisión.
    if (!dte) {
      try {
        dte = await this.db.dte.create({ data: { storeId: order.storeId, orderId: order.id, status: 'ISSUING', ...fields } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return fail('La boleta de este pedido ya se está emitiendo.');
        throw e;
      }
    } else {
      // Si cambió el modo (prueba → de verdad), la llave de idempotencia también cambia.
      const claimed = await this.db.dte.updateMany({
        where: { id: dte.id, OR: [{ status: 'FAILED' }, { status: 'ISSUING', updatedAt: { lt: new Date(Date.now() - STALE_MS) } }] },
        data: { status: 'ISSUING', error: null, ...fields, ...(dte.test !== fields.test ? { attempts: { increment: 1 } } : {}) },
      });
      if (!claimed.count) return fail('La boleta de este pedido ya se está emitiendo.');
      dte = await this.db.dte.findUniqueOrThrow({ where: { id: dte.id } });
    }

    try {
      const doc = buildBoleta({
        type: creds.type,
        issueDate,
        issuer: creds.issuer,
        receiver: { rut, name: rut === GENERIC_RUT ? null : a.name },
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
        shipping: order.shippingTotal,
        discount: order.discountTotal,
        total: order.total,
      });
      // `attempts` cuenta los rechazos: después de corregir algo, la llave cambia y el
      // proveedor lo toma como un documento nuevo. Si solo se cortó la conexión, la llave
      // es la misma y no se emite dos veces.
      const r = await openfactura.emit(creds, doc, `${dte.id}-${dte.attempts}`);
      dte = await this.db.dte.update({ where: { id: dte.id }, data: { status: 'ISSUED', token: r.token, folio: r.folio, error: null } });
    } catch (e) {
      const rejected = !(e instanceof DteProviderError) || e.rejected;
      const message = e instanceof Error ? e.message : 'Error desconocido';
      dte = await this.db.dte.update({ where: { id: dte.id }, data: { status: 'FAILED', error: message.slice(0, 500), ...(rejected ? { attempts: { increment: 1 } } : {}) } });
    }
    return dteOut(dte);
  }

  private async pdfOf(dte: Pick<Dte, 'id' | 'storeId' | 'status' | 'token' | 'test' | 'folio'>) {
    if (dte.status !== 'ISSUED' || !dte.token) throw new NotFoundException('La boleta todavía no está emitida');
    const c = await this.config(dte.storeId);
    // El PDF se pide en el mismo ambiente en que se emitió la boleta.
    const creds: OpenFacturaCreds | null = dte.test
      ? { apiKey: c?.apiKeyEnc && issuerComplete(issuerOf(c.issuer)) ? decrypt(c.apiKeyEnc) : OPENFACTURA_DEMO_KEY, live: false }
      : c?.apiKeyEnc
        ? { apiKey: decrypt(c.apiKeyEnc), live: true }
        : null;
    if (!creds) throw new NotFoundException('Falta la API key de OpenFactura para descargar la boleta');
    const r = await openfactura.pdf(creds, dte.token);
    if (r.folio && !dte.folio) await this.db.dte.update({ where: { id: dte.id }, data: { folio: r.folio } });
    return { pdf: r.pdf, folio: dte.folio ?? r.folio };
  }

  // ─── Comprador ─────────────────────────────────────────────────────

  async publicPdf(slug: string, orderId: string, key: string) {
    if (!verifyOrderKey(orderId, key)) throw new NotFoundException('Boleta no encontrada');
    const dte = await this.db.dte.findFirst({ where: { orderId, store: { slug } } });
    if (!dte) throw new NotFoundException('Boleta no encontrada');
    return this.pdfOf(dte);
  }

  // ─── Panel ─────────────────────────────────────────────────────────

  async list(access: StoreAccess) {
    const [dtes, missing] = await Promise.all([
      this.db.dte.findMany({
        where: { storeId: access.id },
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { order: { select: { number: true, email: true, shippingAddress: true } } },
      }),
      // Pedidos pagados sin boleta (p. ej. de antes de activarlas, o pagados en modo de prueba).
      this.db.order.findMany({
        where: { storeId: access.id, status: { in: [...SOLD] }, dte: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, number: true, email: true, total: true, createdAt: true, payments: { where: { status: 'AUTHORIZED' }, select: { raw: true } } },
      }),
    ]);
    return {
      receipts: dtes.map((d) => ({ ...dteOut(d), order: d.order ? { number: d.order.number, email: d.order.email, name: (d.order.shippingAddress as { name?: string })?.name ?? null } : null })),
      missing: missing.map(({ payments, ...o }) => ({ ...o, testPayment: payments.some((p) => (p.raw as { test?: boolean } | null)?.test) })),
    };
  }

  async issue(access: StoreAccess, orderId: string) {
    this.assertManager(access);
    return this.issueForOrder(orderId, { manual: true, storeId: access.id });
  }

  async adminPdf(access: StoreAccess, id: string) {
    const dte = await this.db.dte.findFirst({ where: { id, storeId: access.id } });
    if (!dte) throw new NotFoundException('Boleta no encontrada');
    return this.pdfOf(dte);
  }

  async getConfig(access: StoreAccess) {
    const c = await this.config(access.id);
    const i = issuerOf(c?.issuer ?? {});
    return {
      provider: 'openfactura' as const,
      enabled: Boolean(c?.enabled),
      live: Boolean(c?.live),
      exempt: Boolean(c?.exempt),
      hasKey: Boolean(c?.apiKeyEnc),
      issuer: { rut: i.rut ?? '', name: i.name ?? '', activity: i.activity ?? '', address: i.address ?? '', comuna: i.comuna ?? '', branchCode: i.branchCode ?? '' },
      // En prueba sin llave propia se emite con el emisor de prueba de OpenFactura.
      demo: Boolean(c?.enabled && !c.live && !(c.apiKeyEnc && issuerComplete(i))),
    };
  }

  async setConfig(access: StoreAccess, input: BillingConfigInput) {
    this.assertManager(access);
    const prev = await this.config(access.id);
    const issuer = { ...input.issuer, branchCode: input.issuer.branchCode || undefined };
    if (input.enabled && input.live) {
      if (!(input.apiKey || prev?.apiKeyEnc)) throw new BadRequestException('Para emitir boletas de verdad pega la API key de tu cuenta de OpenFactura.');
      if (!issuerComplete(issuer)) throw new BadRequestException('Completa RUT, razón social, giro, dirección y comuna de la empresa: van impresos en cada boleta.');
    }
    const data = {
      enabled: input.enabled,
      live: input.live,
      exempt: input.exempt,
      issuer: issuer as Prisma.InputJsonObject,
      ...(input.apiKey ? { apiKeyEnc: encrypt(input.apiKey) } : {}),
    };
    await this.db.billingConfig.upsert({ where: { storeId: access.id }, create: { storeId: access.id, ...data }, update: data });
    return this.getConfig(access);
  }
}
