import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { AdminOrdersController, PublicOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [PublicOrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
