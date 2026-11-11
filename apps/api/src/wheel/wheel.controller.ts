import { Body, Controller, Get, HttpCode, Injectable, Param, Post, UseGuards } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { z } from 'zod';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.js';
import { WheelService } from './wheel.service.js';
import { ClaimInput, SubscribeInput } from './wheel.schemas.js';

// Como con los códigos, la tienda llama desde su servidor: aquí es un freno general.
// El límite por visitante lo pone la web.
@Injectable()
class PublicRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 120;
}

@Public()
@Controller('stores/:store')
@UseGuards(PublicRateLimitGuard)
export class PublicWheelController {
  constructor(private readonly wheel: WheelService) {}

  @Post('wheel/spin')
  @HttpCode(200)
  spin(@Param('store') store: string) {
    return this.wheel.spin(store);
  }

  @Post('wheel/claim')
  @HttpCode(200)
  claim(@Param('store') store: string, @Body({ schema: ClaimInput }) body: z.infer<typeof ClaimInput>) {
    return this.wheel.claim(store, body.email, body.token);
  }

  @Post('subscribers')
  @HttpCode(200)
  subscribe(@Param('store') store: string, @Body({ schema: SubscribeInput }) body: z.infer<typeof SubscribeInput>) {
    return this.wheel.subscribe(store, body.email);
  }
}

@Controller('admin/stores/:store/subscribers')
@UseGuards(StoreAccessGuard)
export class AdminSubscribersController {
  constructor(private readonly wheel: WheelService) {}

  @Get()
  list(@CurrentStore() store: StoreAccess) {
    return this.wheel.subscribers(store);
  }
}
