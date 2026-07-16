import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotificationsListener } from './notifications.listener';

@Module({
  imports: [UsersModule, MailModule, WhatsappModule],
  providers: [NotificationsListener],
})
export class NotificationsModule {}
