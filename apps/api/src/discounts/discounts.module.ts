import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminDiscountsController, PublicDiscountsController } from './discounts.controller.js';
import { DiscountsService } from './discounts.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminDiscountsController, PublicDiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
