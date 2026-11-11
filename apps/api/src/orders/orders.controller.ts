import { Body, Controller, Get, HttpCode, Injectable, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { z } from 'zod';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.js';
import { RequireTwoFactor } from '../auth/step-up.js';
import { OrdersService } from './orders.service.js';
import {
  CheckoutInput,
  MercadoPagoConfig,
  MercadoPagoNotice,
  MercadoPagoReturn,
  OrderPatch,
  PayInput,
  TransferConfig,
  WebpayConfig,
  WebpayReturn,
} from './orders.schemas.js';

// La tienda llama desde su servidor (todos los clientes llegan con la misma IP): es un
// freno general. El límite por visitante lo pone la web.
@Injectable()
class PublicRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 120;
}

@Public()
@Controller('stores/:store')
@UseGuards(PublicRateLimitGuard)
export class PublicOrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Medios de pago disponibles (para el checkout).
  @Get('payment-methods')
  methods(@Param('store') store: string) {
    return this.orders.methods(store);
  }

  @Post('checkout')
  @HttpCode(200)
  checkout(@Param('store') store: string, @Body({ schema: CheckoutInput }) body: CheckoutInput) {
    return this.orders.checkout(store, body);
  }

  @Get('orders/:id')
  order(@Param('store') store: string, @Param('id') id: string, @Query('k') key = '') {
    return this.orders.publicOrder(store, id, key);
  }

  @Post('orders/:id/pay')
  @HttpCode(200)
  pay(@Param('store') store: string, @Param('id') id: string, @Body({ schema: PayInput }) body: z.infer<typeof PayInput>) {
    return this.orders.pay(store, id, body.key, body.method, body.origin);
  }

  // Vuelta del navegador desde Webpay (la tienda reenvía lo que mandó Transbank).
  @Post('payments/webpay/return')
  @HttpCode(200)
  webpayReturn(@Param('store') store: string, @Body({ schema: WebpayReturn }) body: z.infer<typeof WebpayReturn>) {
    return this.orders.webpayReturn(store, body);
  }

  @Post('payments/mercadopago/return')
  @HttpCode(200)
  mpReturn(@Param('store') store: string, @Body({ schema: MercadoPagoReturn }) body: z.infer<typeof MercadoPagoReturn>) {
    return this.orders.mercadopagoCheck(store, body.order, body.paymentId);
  }

  // Aviso automático de Mercado Pago. No se confía en su contenido: se consulta el pago.
  @Post('payments/mercadopago/notice')
  @HttpCode(200)
  async mpNotice(@Param('store') store: string, @Body({ schema: MercadoPagoNotice }) body: z.infer<typeof MercadoPagoNotice>) {
    await this.orders.mercadopagoCheck(store, body.order, body.paymentId);
    return { ok: true };
  }
}

@Controller('admin/stores/:store')
@UseGuards(StoreAccessGuard)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders')
  list(@CurrentStore() store: StoreAccess, @Query('status') status?: string) {
    return this.orders.list(store, status);
  }

  // Marcar pagado (libera el pedido sin pago en línea) o anular piden el código de 2FA.
  @Patch('orders/:id')
  @RequireTwoFactor((req) => ['PAID', 'CANCELLED'].includes((req.body as { status?: string } | undefined)?.status ?? ''))
  update(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: OrderPatch }) body: z.infer<typeof OrderPatch>) {
    return this.orders.update(store, id, body);
  }

  @Get('payments')
  gateways(@CurrentStore() store: StoreAccess) {
    return this.orders.gatewayConfig(store);
  }

  // Cambiar a dónde llega la plata pide el código de 2FA.
  @Put('payments/webpay')
  @RequireTwoFactor()
  webpay(@CurrentStore() store: StoreAccess, @Body({ schema: WebpayConfig }) body: z.infer<typeof WebpayConfig>) {
    return this.orders.setWebpay(store, body);
  }

  @Put('payments/mercadopago')
  @RequireTwoFactor()
  mercadopago(@CurrentStore() store: StoreAccess, @Body({ schema: MercadoPagoConfig }) body: z.infer<typeof MercadoPagoConfig>) {
    return this.orders.setMercadoPago(store, body);
  }

  @Put('payments/transfer')
  @RequireTwoFactor()
  transfer(@CurrentStore() store: StoreAccess, @Body({ schema: TransferConfig }) body: z.infer<typeof TransferConfig>) {
    return this.orders.setTransfer(store, body);
  }
}
