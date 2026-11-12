import { Body, Controller, Delete, Get, Headers, HttpCode, Injectable, Param, Patch, Post, Put, Query, Req, UseGuards, type RawBodyRequest } from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import type { Request } from 'express';
import type { z } from 'zod';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.js';
import { RequireTwoFactor } from '../auth/step-up.js';
import type { AuthUser } from '../auth/auth.types.js';
import { WhatsappService } from './whatsapp.service.js';
import { ChatPatch, StaffReply, TestMessage, WhatsappConfig } from './whatsapp.schemas.js';

// Meta llama desde sus servidores: freno general contra abusos, holgado para picos.
@Injectable()
class WebhookRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 600;
}

// Webhook de WhatsApp Business Cloud API. La URL va en la app de Meta → WhatsApp →
// Configuración: https://<api>/whatsapp/<tienda>/webhook, con el token de verificación
// que muestra el panel.
@Public()
@Controller('whatsapp/:store/webhook')
@UseGuards(WebhookRateLimitGuard)
export class WhatsappWebhookController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get()
  verify(@Param('store') store: string, @Query('hub.mode') mode = '', @Query('hub.verify_token') token = '', @Query('hub.challenge') challenge = '') {
    return this.whatsapp.verifyWebhook(store, mode, token, challenge);
  }

  // Responde cuando terminó de atender el mensaje: en Vercel la función se congela al
  // responder. Si Meta reintenta, el mensaje repetido se descarta por su id.
  @Post()
  @HttpCode(200)
  receive(@Param('store') store: string, @Req() req: RawBodyRequest<Request>, @Headers('x-hub-signature-256') signature: string | undefined, @Body() body: unknown) {
    return this.whatsapp.receive(store, req.rawBody, signature, body);
  }
}

@Controller('admin/stores/:store/whatsapp')
@UseGuards(StoreAccessGuard)
export class AdminWhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get()
  config(@CurrentStore() store: StoreAccess) {
    return this.whatsapp.config(store);
  }

  // Tokens de Meta y API key: cambio crítico, pide el código de 2FA.
  @Put()
  @RequireTwoFactor()
  save(@CurrentStore() store: StoreAccess, @Body({ schema: WhatsappConfig }) body: z.infer<typeof WhatsappConfig>) {
    return this.whatsapp.saveConfig(store, body);
  }

  @Get('conversations')
  conversations(@CurrentStore() store: StoreAccess, @Query('status') status?: string) {
    return this.whatsapp.conversations(store, status);
  }

  @Get('conversations/:id')
  messages(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return this.whatsapp.messages(store, id);
  }

  @Post('conversations/:id/reply')
  @HttpCode(200)
  reply(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: StaffReply }) body: z.infer<typeof StaffReply>) {
    return this.whatsapp.reply(store, id, body.text);
  }

  @Patch('conversations/:id')
  status(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: ChatPatch }) body: z.infer<typeof ChatPatch>) {
    return this.whatsapp.setStatus(store, id, body.status);
  }

  @Get('test')
  testChat(@CurrentStore() store: StoreAccess, @CurrentUser() user: AuthUser) {
    return this.whatsapp.testChat(store, user.id);
  }

  @Post('test')
  @HttpCode(200)
  test(@CurrentStore() store: StoreAccess, @CurrentUser() user: AuthUser, @Body({ schema: TestMessage }) body: z.infer<typeof TestMessage>) {
    return this.whatsapp.test(store, user.id, body.text);
  }

  @Delete('test')
  resetTest(@CurrentStore() store: StoreAccess, @CurrentUser() user: AuthUser) {
    return this.whatsapp.resetTest(store, user.id);
  }
}
