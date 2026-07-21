import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DOCUMENT_REMOVED,
  DocumentRemovedEvent,
} from '../notifications/events';
import { StorageService } from '../storage/storage.service';
import { PageCacheService } from './page-cache.service';

/**
 * Membuang berkas milik koleksi yang dihapus: PDF master, sampul, dan seluruh
 * cache render halamannya. Dijalankan lewat event agar modul katalog tidak
 * perlu tahu apa pun tentang penyimpanan objek.
 */
@Injectable()
export class DocumentFilesListener {
  private readonly logger = new Logger(DocumentFilesListener.name);

  constructor(
    private readonly storage: StorageService,
    private readonly pageCache: PageCacheService,
  ) {}

  @OnEvent(DOCUMENT_REMOVED)
  async onRemoved(event: DocumentRemovedEvent): Promise<void> {
    try {
      if (event.masterObjectKey) await this.storage.delete(event.masterObjectKey);
      if (event.coverObjectKey) await this.storage.delete(event.coverObjectKey);
      await this.pageCache.evictDocument(event.documentId);
    } catch (err) {
      // Kegagalan pembersihan tidak boleh membatalkan penghapusan koleksi;
      // cukup dicatat agar bisa dirapikan manual.
      this.logger.error(
        `Gagal membersihkan berkas koleksi ${event.documentId}: ${(err as Error).message}`,
      );
    }
  }
}
