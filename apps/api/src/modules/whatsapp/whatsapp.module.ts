import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

/** Channel notifikasi WhatsApp (PRD I5), dipakai NotificationsModule. */
@Module({
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
