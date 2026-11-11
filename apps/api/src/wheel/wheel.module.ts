import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminSubscribersController, PublicWheelController } from './wheel.controller.js';
import { WheelService } from './wheel.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PublicWheelController, AdminSubscribersController],
  providers: [WheelService],
})
export class WheelModule {}
