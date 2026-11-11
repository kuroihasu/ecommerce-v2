import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminBillingController, PublicBillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PublicBillingController, AdminBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
