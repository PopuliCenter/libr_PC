import { Injectable, Logger } from '@nestjs/common';

/**
 * Pengirim email. Dev: menulis ke log aplikasi.
 * Produksi: ganti implementasi send() dengan SMTP/provider (SES, Mailersend, dll).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[EMAIL → ${to}] ${subject}\n${body}`);
  }

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    await this.send(
      to,
      'Verifikasi Email — Perpustakaan Digital Populi Center',
      `Terima kasih telah mendaftar. Klik tautan berikut untuk mengaktifkan akun Anda (berlaku 24 jam):\n${verifyUrl}`,
    );
  }
}
