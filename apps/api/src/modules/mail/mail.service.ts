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

  private fmt(d: Date): string {
    return new Date(d).toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }

  async sendLoanCreated(to: string, title: string, expiresAt: Date): Promise<void> {
    await this.send(
      to,
      `Peminjaman berhasil: ${title}`,
      `Anda berhasil meminjam "${title}".\nAkses baca berlaku hingga ${this.fmt(expiresAt)}.\nSelamat membaca di Perpustakaan Digital Populi Center.`,
    );
  }

  async sendLoanExpiringSoon(
    to: string,
    title: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.send(
      to,
      `Pengingat: masa pinjam "${title}" segera berakhir`,
      `Masa pinjam Anda untuk "${title}" akan berakhir pada ${this.fmt(expiresAt)}.\nSelesaikan bacaan Anda sebelum waktu tersebut. Anda dapat meminjam kembali bila kopi tersedia.`,
    );
  }

  async sendLoanExpired(to: string, title: string): Promise<void> {
    await this.send(
      to,
      `Masa pinjam berakhir: ${title}`,
      `Masa pinjam Anda untuk "${title}" telah berakhir dan akses baca ditutup.\nSilakan pinjam kembali melalui katalog bila ingin melanjutkan.`,
    );
  }

  async sendHoldOffered(
    to: string,
    title: string,
    claimUrl: string,
    offerExpiresAt: Date,
  ): Promise<void> {
    await this.send(
      to,
      `Giliran Anda tiba: ${title}`,
      `Kabar baik! Kopi digital "${title}" kini tersedia untuk Anda.\nKlaim sebelum ${this.fmt(offerExpiresAt)} — bila terlewat, giliran berpindah ke antrian berikutnya.\nKlaim di sini: ${claimUrl}`,
    );
  }

  async sendNewPublication(to: string, title: string, url: string): Promise<void> {
    await this.send(
      to,
      `Terbitan baru sesuai minat Anda: ${title}`,
      `Koleksi baru "${title}" telah terbit di Perpustakaan Digital Populi Center, sesuai topik minat Anda.\nLihat selengkapnya: ${url}\n\nAnda menerima email ini karena menyetujui pemberitahuan terbitan baru. Ubah preferensi di halaman Akun Saya.`,
    );
  }
}
