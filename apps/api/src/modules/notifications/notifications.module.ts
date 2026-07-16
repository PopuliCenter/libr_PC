import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { NotificationsListener } from './notifications.listener';

@Module({
  imports: [UsersModule, MailModule],
  providers: [NotificationsListener],
})
export class NotificationsModule {}
