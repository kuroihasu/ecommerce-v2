import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminOrdersController, PublicOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PublicOrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
