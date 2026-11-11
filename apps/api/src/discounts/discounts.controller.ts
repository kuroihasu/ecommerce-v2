import { Body, Controller, Delete, Get, HttpCode, Injectable, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { z } from 'zod';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.js';
import { RequireTwoFactor } from '../auth/step-up.js';
import { DiscountsService } from './discounts.service.js';
import { CheckInput, DiscountInput, DiscountPatch } from './discounts.schemas.js';

@Controller('admin/stores/:store/discounts')
@UseGuards(StoreAccessGuard)
export class AdminDiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get()
  list(@CurrentStore() store: StoreAccess) {
    return this.discounts.list(store);
  }

  // Crear o cambiar un código de descuento pide el código de 2FA (pausarlo no).
  @Post()
  @RequireTwoFactor()
  create(@CurrentStore() store: StoreAccess, @Body({ schema: DiscountInput }) body: DiscountInput) {
    return this.discounts.create(store, body);
  }

  @Patch(':id')
  @RequireTwoFactor((req) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    return !(Object.keys(b).length === 1 && b.active === false);
  })
  update(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: DiscountPatch }) body: DiscountPatch) {
    return this.discounts.update(store, id, body);
  }

  @Delete(':id')
  remove(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return this.discounts.remove(store, id);
  }

  @Post(':id/feature')
  feature(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return this.discounts.feature(store, id);
  }
}

// La tienda consulta desde su servidor, así que aquí todos los clientes llegan con la
// IP de la web: este límite es un freno general contra quien intente adivinar códigos.
// El límite por visitante (20 por minuto) lo pone la web (apps/web/src/lib/discounts.ts).
@Injectable()
class CheckRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 120;
  protected readonly message = 'Demasiados intentos con códigos. Espera un minuto.';
}

@Public()
@Controller('stores/:store/discounts')
export class PublicDiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Post('check')
  @HttpCode(200)
  @UseGuards(CheckRateLimitGuard)
  check(@Param('store') store: string, @Body({ schema: CheckInput }) body: z.infer<typeof CheckInput>) {
    return this.discounts.check(store, body.code);
  }
}
