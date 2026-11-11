import { Body, Controller, Get, Header, HttpCode, Injectable, Param, Post, Put, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.js';
import { RequireTwoFactor } from '../auth/step-up.js';
import { BillingService } from './billing.service.js';
import { BillingConfigInput } from './billing.schemas.js';

const pdfFile = (r: { pdf: Buffer; folio: number | null }) =>
  new StreamableFile(r.pdf, { type: 'application/pdf', disposition: `inline; filename="boleta-${r.folio ?? 'sii'}.pdf"`, length: r.pdf.length });

@Injectable()
class PublicRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 60;
}

@Public()
@Controller('stores/:store')
@UseGuards(PublicRateLimitGuard)
export class PublicBillingController {
  constructor(private readonly billing: BillingService) {}

  // PDF de la boleta de un pedido, para el comprador (con la llave firmada del pedido).
  @Get('orders/:id/receipt')
  @Header('cache-control', 'private, no-store')
  async receipt(@Param('store') store: string, @Param('id') id: string, @Query('k') key = '') {
    return pdfFile(await this.billing.publicPdf(store, id, key));
  }
}

@Controller('admin/stores/:store/receipts')
@UseGuards(StoreAccessGuard)
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@CurrentStore() store: StoreAccess) {
    return this.billing.list(store);
  }

  @Get('config')
  config(@CurrentStore() store: StoreAccess) {
    return this.billing.getConfig(store);
  }

  // La API key de facturación emite documentos tributarios a nombre de la empresa: pide 2FA.
  @Put('config')
  @RequireTwoFactor()
  setConfig(@CurrentStore() store: StoreAccess, @Body({ schema: BillingConfigInput }) body: BillingConfigInput) {
    return this.billing.setConfig(store, body);
  }

  // Emitir (o reintentar) la boleta de un pedido pagado.
  @Post('orders/:orderId')
  @HttpCode(200)
  issue(@CurrentStore() store: StoreAccess, @Param('orderId') orderId: string) {
    return this.billing.issue(store, orderId);
  }

  @Get(':id/pdf')
  @Header('cache-control', 'private, no-store')
  async pdf(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return pdfFile(await this.billing.adminPdf(store, id));
  }
}
