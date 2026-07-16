import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  DOCUMENT_PUBLISHED,
  DocumentPublishedEvent,
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
 * Mendengarkan event domain dan mengirim notifikasi lewat semua channel yang
 * aktif (email selalu; WhatsApp bila anggota punya nomor & gateway dikonfigurasi).
 * Tiap channel dikirim independen — kegagalan satu channel tak memengaruhi yang
 * lain maupun alur utama.
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent(LOAN_CREATED)
  async onLoanCreated(e: LoanCreatedEvent): Promise<void> {
    await this.dispatch(
      e.userId,
      (email) => this.mail.sendLoanCreated(email, e.documentTitle, e.expiresAt),
      (phone) => this.whatsapp.loanCreated(phone, e.documentTitle, e.expiresAt),
    );
  }

  @OnEvent(LOAN_EXPIRING)
  async onLoanExpiring(e: LoanExpiringEvent): Promise<void> {
    await this.dispatch(
      e.userId,
      (email) => this.mail.sendLoanExpiringSoon(email, e.documentTitle, e.expiresAt),
      (phone) => this.whatsapp.loanExpiringSoon(phone, e.documentTitle, e.expiresAt),
    );
  }

  @OnEvent(LOAN_RELEASED)
  async onLoanReleased(e: LoanReleasedEvent): Promise<void> {
    if (e.reason !== 'expired') return; // pengembalian manual tak perlu notifikasi
    await this.dispatch(
      e.userId,
      (email) => this.mail.sendLoanExpired(email, e.documentTitle),
      (phone) => this.whatsapp.loanExpired(phone, e.documentTitle),
    );
  }

  @OnEvent(HOLD_OFFERED)
  async onHoldOffered(e: HoldOfferedEvent): Promise<void> {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const claimUrl = `${webUrl}/katalog/${e.documentSlug}`;
    await this.dispatch(
      e.userId,
      (email) =>
        this.mail.sendHoldOffered(email, e.documentTitle, claimUrl, e.offerExpiresAt),
      (phone) =>
        this.whatsapp.holdOffered(phone, e.documentTitle, claimUrl, e.offerExpiresAt),
    );
  }

  /**
   * Terbitan baru → notifikasi tersegmentasi ke anggota yang (a) menyetujui
   * newsletter dan (b) minatnya cocok dengan topik koleksi (UU PDP). Tiap
   * anggota & channel di-try/catch terpisah agar satu kegagalan tak menghentikan
   * pengiriman ke yang lain.
   */
  @OnEvent(DOCUMENT_PUBLISHED)
  async onDocumentPublished(e: DocumentPublishedEvent): Promise<void> {
    const recipients = await this.users
      .findNewsletterRecipients(e.topics)
      .catch(() => []);
    if (recipients.length === 0) return;

    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const url = `${webUrl}/katalog/${e.slug}`;
    this.logger.log(
      `Terbitan baru "${e.title}" → ${recipients.length} anggota tersegmentasi.`,
    );

    for (const user of recipients) {
      try {
        await this.mail.sendNewPublication(user.email, e.title, url);
      } catch (err) {
        this.logger.error(`Newsletter email gagal: ${(err as Error).message}`);
      }
      if (user.phone && this.whatsapp.enabled) {
        try {
          await this.whatsapp.newPublication(user.phone, e.title, url);
        } catch (err) {
          this.logger.error(`Newsletter WA gagal: ${(err as Error).message}`);
        }
      }
    }
  }

  /**
   * Kirim ke semua channel anggota. Email selalu; WhatsApp hanya bila anggota
   * mencantumkan nomor. Tiap channel di-try/catch terpisah.
   */
  private async dispatch(
    userId: string,
    email: (email: string) => Promise<unknown>,
    whatsapp: (phone: string) => Promise<unknown>,
  ): Promise<void> {
    const user = await this.users.findById(userId).catch(() => null);
    if (!user) return;

    try {
      await email(user.email);
    } catch (err) {
      this.logger.error(`Notifikasi email gagal: ${(err as Error).message}`);
    }

    if (user.phone && this.whatsapp.enabled) {
      try {
        await whatsapp(user.phone);
      } catch (err) {
        this.logger.error(`Notifikasi WhatsApp gagal: ${(err as Error).message}`);
      }
    }
  }
}
