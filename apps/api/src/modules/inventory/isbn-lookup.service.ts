import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsbnCache, IsbnMetadata } from './entities/isbn-cache.entity';

export interface IsbnLookupResult {
  isbn: string;
  found: boolean;
  source: string;
  metadata: IsbnMetadata | null;
}

const FETCH_TIMEOUT_MS = 6000;

/**
 * Lookup metadata dari ISBN: cache lokal → Google Books → Open Library.
 * Gagal (jaringan/limit) mengembalikan found=false agar UI beralih ke input manual.
 */
@Injectable()
export class IsbnLookupService {
  private readonly logger = new Logger(IsbnLookupService.name);

  constructor(
    @InjectRepository(IsbnCache)
    private readonly cache: Repository<IsbnCache>,
  ) {}

  async lookup(rawIsbn: string): Promise<IsbnLookupResult> {
    const isbn = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();
    if (isbn.length < 10) {
      return { isbn, found: false, source: 'invalid', metadata: null };
    }

    const cached = await this.cache.findOne({ where: { isbn } });
    if (cached) {
      return {
        isbn,
        found: true,
        source: `cache:${cached.source}`,
        metadata: cached.payload,
      };
    }

    const fromGoogle = await this.fromGoogleBooks(isbn);
    if (fromGoogle) return this.store(isbn, fromGoogle, 'google_books');

    const fromOpenLib = await this.fromOpenLibrary(isbn);
    if (fromOpenLib) return this.store(isbn, fromOpenLib, 'open_library');

    return { isbn, found: false, source: 'not_found', metadata: null };
  }

  /** Simpan metadata manual (koreksi pustakawan) ke cache. */
  async saveManual(isbn: string, metadata: IsbnMetadata): Promise<void> {
    const key = isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
    if (key.length < 10) return;
    await this.cache.save(
      this.cache.create({
        isbn: key,
        payload: metadata,
        source: 'manual',
        fetchedAt: new Date(),
      }),
    );
  }

  private async store(
    isbn: string,
    metadata: IsbnMetadata,
    source: IsbnCache['source'],
  ): Promise<IsbnLookupResult> {
    await this.cache.save(
      this.cache.create({ isbn, payload: metadata, source, fetchedAt: new Date() }),
    );
    return { isbn, found: true, source, metadata };
  }

  private async fromGoogleBooks(isbn: string): Promise<IsbnMetadata | null> {
    try {
      const data = await this.getJson(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      );
      const info = data?.items?.[0]?.volumeInfo;
      if (!info) return null;
      return {
        title: info.title ?? 'Tanpa Judul',
        authors: info.authors ?? [],
        publisher: info.publisher ?? null,
        year: info.publishedDate
          ? parseInt(String(info.publishedDate).slice(0, 4), 10) || null
          : null,
        coverUrl: info.imageLinks?.thumbnail ?? null,
      };
    } catch (err) {
      this.logger.warn(`Google Books gagal: ${(err as Error).message}`);
      return null;
    }
  }

  private async fromOpenLibrary(isbn: string): Promise<IsbnMetadata | null> {
    try {
      const data = await this.getJson(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      );
      const book = data?.[`ISBN:${isbn}`];
      if (!book) return null;
      return {
        title: book.title ?? 'Tanpa Judul',
        authors: (book.authors ?? []).map((a: { name: string }) => a.name),
        publisher: book.publishers?.[0]?.name ?? null,
        year: book.publish_date
          ? parseInt(String(book.publish_date).match(/\d{4}/)?.[0] ?? '', 10) ||
            null
          : null,
        coverUrl: book.cover?.medium ?? null,
      };
    } catch (err) {
      this.logger.warn(`Open Library gagal: ${(err as Error).message}`);
      return null;
    }
  }

  private async getJson(url: string): Promise<any> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }
}
