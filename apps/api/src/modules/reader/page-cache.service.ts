import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from '../storage/storage.service';

export const PAGE_CACHE_PREFIX = 'pages';

/**
 * Penjaga cache render halaman.
 *
 * Tanpa ini cache `pages/` tumbuh tanpa batas: setiap halaman yang pernah
 * dibuka tersimpan permanen (±18 KB/halaman untuk PDF teks, ±240 KB untuk
 * hasil pindai), sehingga satu koleksi ribuan judul bisa menghabiskan puluhan
 * GB disk server. Isi cache selalu bisa dibuat ulang dari PDF master, jadi
 * menghapus yang lama tidak menghilangkan data apa pun — hanya membuat
 * pembacaan berikutnya merender sekali lagi.
 */
@Injectable()
export class PageCacheService {
  private readonly logger = new Logger(PageCacheService.name);
  private readonly ttlDays: number;

  constructor(
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.ttlDays = Number(config.get('PAGE_CACHE_TTL_DAYS', 30));
  }

  /** Buang cache milik satu koleksi (dipakai saat koleksi/PDF-nya berubah). */
  async evictDocument(documentId: string): Promise<void> {
    await this.storage.deletePrefix(`${PAGE_CACHE_PREFIX}/${documentId}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async evictStale(): Promise<CacheEvictionResult> {
    if (this.ttlDays <= 0) return { removed: 0, freedBytes: 0 };

    const cutoff = Date.now() - this.ttlDays * 24 * 60 * 60 * 1000;
    const stale = (await this.storage.list(PAGE_CACHE_PREFIX)).filter(
      (o) => o.modifiedAt.getTime() < cutoff,
    );

    let freedBytes = 0;
    for (const object of stale) {
      await this.storage.delete(object.key);
      freedBytes += object.size;
    }

    if (stale.length > 0) {
      this.logger.log(
        `Cache halaman dibersihkan: ${stale.length} berkas, ` +
          `${(freedBytes / 1024 / 1024).toFixed(1)} MB (lebih tua dari ${this.ttlDays} hari)`,
      );
    }
    return { removed: stale.length, freedBytes };
  }
}

export interface CacheEvictionResult {
  removed: number;
  freedBytes: number;
}
