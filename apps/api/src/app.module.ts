import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { DiscountsModule } from './discounts/discounts.module.js';
import { WheelModule } from './wheel/wheel.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { AccountingModule } from './accounting/accounting.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, AuthModule, CatalogModule, AdminModule, IntegrationsModule, DiscountsModule, WheelModule, OrdersModule, InventoryModule, AccountingModule],
  controllers: [HealthController],
  // Valida los cuerpos con los esquemas Zod de cada ruta (`@Body({ schema })`).
  providers: [{ provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() }],
})
export class AppModule {}
