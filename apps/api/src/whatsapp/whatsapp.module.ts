import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminWhatsappController, WhatsappWebhookController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WhatsappWebhookController, AdminWhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
