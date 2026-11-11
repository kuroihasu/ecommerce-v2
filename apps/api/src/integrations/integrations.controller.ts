import { Body, Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { z } from 'zod';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import type { AuthUser } from '../auth/auth.types.js';
import { IntegrationsService, PROVIDERS, type ProviderSlug } from './integrations.service.js';

const StartBody = z.object({ redirectUri: z.string().url().max(500) });
const FinishBody = z.object({ code: z.string().min(1).max(2000), state: z.string().min(1).max(2000), redirectUri: z.string().url().max(500) });

const slugOf = (p: string): ProviderSlug => {
  if (!Object.hasOwn(PROVIDERS, p)) throw new NotFoundException();
  return p as ProviderSlug;
};

// Cuentas de Meta y Google de la tienda. Requiere sesión y ser miembro de la tienda;
// conectar y desconectar solo dueños y administradores (ver el servicio).
@Controller('admin/stores/:store/integrations')
@UseGuards(StoreAccessGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list(@CurrentStore() store: StoreAccess) {
    return this.integrations.list(store);
  }

  @Post(':provider/start')
  start(@CurrentStore() store: StoreAccess, @CurrentUser() user: AuthUser, @Param('provider') p: string, @Body({ schema: StartBody }) body: z.infer<typeof StartBody>) {
    return this.integrations.start(store, user.id, slugOf(p), body.redirectUri);
  }

  @Post(':provider/finish')
  finish(@CurrentStore() store: StoreAccess, @CurrentUser() user: AuthUser, @Param('provider') p: string, @Body({ schema: FinishBody }) body: z.infer<typeof FinishBody>) {
    return this.integrations.finish(store, user.id, slugOf(p), body);
  }

  @Get(':provider/insights')
  insights(@CurrentStore() store: StoreAccess, @Param('provider') p: string) {
    return this.integrations.insights(store, slugOf(p));
  }

  @Delete(':provider')
  disconnect(@CurrentStore() store: StoreAccess, @Param('provider') p: string) {
    return this.integrations.disconnect(store, slugOf(p));
  }
}
