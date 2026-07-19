import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentsService } from '../catalog/documents.service';
import { StorageService } from '../storage/storage.service';
import { DocumentChunk } from './entities/document-chunk.entity';

/** mupdf ESM-only → dynamic import via Function() (sama dgn PdfRenderService). */
let mupdfModule: any;
async function loadMupdf(): Promise<any> {
  if (!mupdfModule) mupdfModule = await Function("return import('mupdf')")();
  return mupdfModule;
}

const MAX_CHUNK_CHARS = 1200;

/**
 * Membangun indeks teks koleksi untuk RAG (PRD P2): mengekstrak teks per halaman
 * dari PDF master (MuPDF) dan menyimpannya sebagai potongan. Otomatis berjalan
 * saat PDF diunggah; bisa dipicu ulang oleh pustakawan.
 */
@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunks: Repository<DocumentChunk>,
    private readonly documents: DocumentsService,
    private readonly storage: StorageService,
  ) {}

  @OnEvent('document.digitized')
  async onDigitized(payload: { documentId: string }): Promise<void> {
    try {
      await this.indexDocument(payload.documentId);
    } catch (err) {
      this.logger.error(`Auto-index gagal: ${(err as Error).message}`);
    }
  }

  /** Ekstrak & simpan ulang potongan teks untuk satu koleksi. */
  async indexDocument(documentId: string): Promise<{ pages: number; chunks: number }> {
    const doc = await this.documents.findById(documentId);
    if (!doc.masterObjectKey) {
      throw new Error('Koleksi belum punya PDF master');
    }

    const mupdf = await loadMupdf();
    const pdf = await this.storage.get(doc.masterObjectKey);
    const pdfDoc = mupdf.Document.openDocument(pdf, 'application/pdf');
    const rows: Partial<DocumentChunk>[] = [];
    try {
      const pages = pdfDoc.countPages();
      for (let i = 0; i < pages; i++) {
        const page = pdfDoc.loadPage(i);
        const text = normalize(
          page.toStructuredText('preserve-whitespace').asText(),
        );
        if (!text) continue;
        splitText(text).forEach((part, idx) =>
          rows.push({ documentId, pageNo: i + 1, chunkIndex: idx, text: part }),
        );
      }
    } finally {
      pdfDoc.destroy();
    }

    await this.chunks.delete({ documentId });
    if (rows.length) await this.chunks.save(rows);
    this.logger.log(`Indeks "${doc.title}": ${rows.length} potongan.`);
    return { pages: doc.pageCount ?? 0, chunks: rows.length };
  }

  async isIndexed(documentId: string): Promise<boolean> {
    return (await this.chunks.count({ where: { documentId } })) > 0;
  }
}

/** Rapikan spasi/baris hasil ekstraksi. */
function normalize(text: string): string {
  return text.replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Pecah teks halaman panjang menjadi potongan pada batas paragraf/kalimat. */
function splitText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const parts: string[] = [];
  let buf = '';
  for (const seg of text.split(/(?<=[.!?])\s+|\n{2,}/)) {
    if ((buf + ' ' + seg).length > MAX_CHUNK_CHARS && buf) {
      parts.push(buf.trim());
      buf = seg;
    } else {
      buf = buf ? `${buf} ${seg}` : seg;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}
