import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WaResult {
  ok: boolean;
  provider: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Channel notifikasi WhatsApp (PRD I5). Provider-agnostik dengan driver yang
 * dipilih via `WA_PROVIDER`:
 *   - `log`  : tulis ke log aplikasi (default dev) — untuk pengembangan/uji.
 *   - `fonnte`: gateway WABA lokal (Fonnte) — token + POST sederhana.
 *   - `meta` : WhatsApp Cloud API (Meta) — Bearer token + Graph API.
 *   - `none` : nonaktif (default produksi bila WA_PROVIDER kosong) — no-op.
 *
 * Degradasi anggun: bila tak dikonfigurasi atau nomor tak valid, panggilan
 * di-skip tanpa melempar — notifikasi WA tak boleh mengganggu alur utama.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly provider: string;
  private readonly defaultCountry: string;

  constructor(private readonly config: ConfigService) {
    const configured = (config.get<string>('WA_PROVIDER', '') ?? '')
      .trim()
      .toLowerCase();
    this.provider =
      configured || (process.env.NODE_ENV === 'production' ? 'none' : 'log');
    this.defaultCountry = (
      config.get<string>('WA_DEFAULT_COUNTRY', '62') ?? '62'
    ).replace(/\D/g, '');

    if (['fonnte', 'meta'].includes(this.provider) && !this.hasCreds()) {
      this.logger.warn(
        `WA_PROVIDER=${this.provider} tapi kredensial belum lengkap — pengiriman WA akan gagal sampai diisi.`,
      );
    }
  }

  get enabled(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Normalisasi ke format internasional tanpa "+" (mis. 6281234567890),
   * yang diterima gateway WABA. Mengembalikan null bila jelas tak valid.
   */
  normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let d = String(raw).replace(/[^\d+]/g, '');
    d = d.replace(/^\+/, '').replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('0')) {
      d = this.defaultCountry + d.slice(1);
    } else if (this.defaultCountry === '62' && d.startsWith('8')) {
      // Nomor seluler Indonesia yang ditulis tanpa 0 di depan.
      d = this.defaultCountry + d;
    }
    if (d.length < 8 || d.length > 15) return null;
    return d;
  }

  async send(rawPhone: string, message: string): Promise<WaResult> {
    if (!this.enabled) return { ok: false, provider: 'none', skipped: true };
    const phone = this.normalizePhone(rawPhone);
    if (!phone) {
      return {
        ok: false,
        provider: this.provider,
        skipped: true,
        error: 'nomor tidak valid',
      };
    }
    try {
      switch (this.provider) {
        case 'log':
          this.logger.log(`[WA → ${phone}] ${message}`);
          return { ok: true, provider: 'log' };
        case 'fonnte':
          return await this.viaFonnte(phone, message);
        case 'meta':
          return await this.viaMeta(phone, message);
        default:
          this.logger.warn(`Provider WA tak dikenal: ${this.provider}`);
          return { ok: false, provider: this.provider, error: 'provider tak dikenal' };
      }
    } catch (err) {
      this.logger.error(
        `Kirim WA gagal (${this.provider}): ${(err as Error).message}`,
      );
      return { ok: false, provider: this.provider, error: (err as Error).message };
    }
  }

  // ===================================================================
  // Template pesan (ringkas, gaya WhatsApp) — sejalan dengan email.
  // ===================================================================

  private fmt(d: Date): string {
    return new Date(d).toLocaleString('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }

  loanCreated(phone: string, title: string, expiresAt: Date): Promise<WaResult> {
    return this.send(
      phone,
      `✅ *Populi Library*\nPeminjaman "${title}" berhasil. Akses baca berlaku hingga ${this.fmt(expiresAt)}. Selamat membaca!`,
    );
  }

  loanExpiringSoon(phone: string, title: string, expiresAt: Date): Promise<WaResult> {
    return this.send(
      phone,
      `⏰ *Populi Library*\nMasa pinjam "${title}" berakhir ${this.fmt(expiresAt)}. Selesaikan bacaan Anda sebelum waktu tersebut.`,
    );
  }

  loanExpired(phone: string, title: string): Promise<WaResult> {
    return this.send(
      phone,
      `📕 *Populi Library*\nMasa pinjam "${title}" telah berakhir. Silakan pinjam kembali via katalog bila ingin melanjutkan.`,
    );
  }

  holdOffered(
    phone: string,
    title: string,
    claimUrl: string,
    offerExpiresAt: Date,
  ): Promise<WaResult> {
    return this.send(
      phone,
      `🎉 *Populi Library*\nGiliran Anda tiba! Kopi "${title}" kini tersedia. Klaim sebelum ${this.fmt(offerExpiresAt)}: ${claimUrl}`,
    );
  }

  // ===================================================================
  // Driver
  // ===================================================================

  private hasCreds(): boolean {
    if (this.provider === 'fonnte') return !!this.config.get('WA_FONNTE_TOKEN');
    if (this.provider === 'meta') {
      return !!this.config.get('WA_META_PHONE_ID') && !!this.config.get('WA_META_TOKEN');
    }
    return true;
  }

  private async viaFonnte(phone: string, message: string): Promise<WaResult> {
    const token = this.config.get<string>('WA_FONNTE_TOKEN', '');
    if (!token) throw new Error('WA_FONNTE_TOKEN kosong');
    const res = await this.fetchWithTimeout('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ target: phone, message }).toString(),
    });
    if (!res.ok) throw new Error(`Fonnte HTTP ${res.status}`);
    return { ok: true, provider: 'fonnte' };
  }

  private async viaMeta(phone: string, message: string): Promise<WaResult> {
    const phoneId = this.config.get<string>('WA_META_PHONE_ID', '');
    const token = this.config.get<string>('WA_META_TOKEN', '');
    if (!phoneId || !token) throw new Error('WA_META_PHONE_ID/WA_META_TOKEN kosong');
    const res = await this.fetchWithTimeout(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      },
    );
    if (!res.ok) throw new Error(`Meta HTTP ${res.status}`);
    return { ok: true, provider: 'meta' };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    ms = 8000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
