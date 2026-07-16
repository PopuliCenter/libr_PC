import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import {
  HOLD_OFFERED,
  HoldOfferedEvent,
  LOAN_CREATED,
  LOAN_EXPIRING,
  LOAN_RELEASED,
  LoanCreatedEvent,
  LoanExpiringEvent,
  LoanReleasedEvent,
} from './events';

/**
 * Mendengarkan event domain dan mengirim email terkait.
 * Kegagalan email tidak boleh memengaruhi alur utama (di-catch).
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent(LOAN_CREATED)
  async onLoanCreated(e: LoanCreatedEvent): Promise<void> {
    await this.toUser(e.userId, (email) =>
      this.mail.sendLoanCreated(email, e.documentTitle, e.expiresAt),
    );
  }

  @OnEvent(LOAN_EXPIRING)
  async onLoanExpiring(e: LoanExpiringEvent): Promise<void> {
    await this.toUser(e.userId, (email) =>
      this.mail.sendLoanExpiringSoon(email, e.documentTitle, e.expiresAt),
    );
  }

  @OnEvent(LOAN_RELEASED)
  async onLoanReleased(e: LoanReleasedEvent): Promise<void> {
    if (e.reason !== 'expired') return; // pengembalian manual tak perlu email
    await this.toUser(e.userId, (email) =>
      this.mail.sendLoanExpired(email, e.documentTitle),
    );
  }

  @OnEvent(HOLD_OFFERED)
  async onHoldOffered(e: HoldOfferedEvent): Promise<void> {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    await this.toUser(e.userId, (email) =>
      this.mail.sendHoldOffered(
        email,
        e.documentTitle,
        `${webUrl}/katalog/${e.documentSlug}`,
        e.offerExpiresAt,
      ),
    );
  }

  private async toUser(
    userId: string,
    sendFn: (email: string) => Promise<void>,
  ): Promise<void> {
    try {
      const user = await this.users.findById(userId);
      if (user) await sendFn(user.email);
    } catch (err) {
      this.logger.error(`Gagal mengirim notifikasi: ${(err as Error).message}`);
    }
  }
}
