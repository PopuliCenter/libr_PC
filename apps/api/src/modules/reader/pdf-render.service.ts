import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from '../storage/storage.service';

/**
 * mupdf adalah paket ESM-only; proyek ini dikompilasi ke CommonJS.
 * Dynamic import via Function() mencegah TypeScript menurunkannya
 * menjadi require() yang akan gagal saat runtime.
 */
let mupdfModule: any;
async function loadMupdf(): Promise<any> {
  if (!mupdfModule) {
    mupdfModule = await Function("return import('mupdf')")();
  }
  return mupdfModule;
}

const RENDER_SCALE = 2; // ±150 dpi — cukup tajam untuk dibaca, berat file moderat

export interface WatermarkInfo {
  name: string;
  email: string;
}

/**
 * Render PDF → gambar per halaman (MuPDF WASM — portabel, tanpa binary sistem).
 * Halaman dasar di-cache di storage; watermark identitas ditanam ke piksel
 * PER-REQUEST sehingga tiap salinan membawa jejak pembacanya.
 */
@Injectable()
export class PdfRenderService {
  private readonly logger = new Logger(PdfRenderService.name);

  constructor(private readonly storage: StorageService) {}

  async pageCount(pdf: Buffer): Promise<number> {
    const mupdf = await loadMupdf();
    const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
    try {
      return doc.countPages();
    } finally {
      doc.destroy();
    }
  }

  /**
   * Ambil halaman ber-watermark. Render dasar diambil dari cache bila ada;
   * bila belum, dirender dari master lalu disimpan.
   */
  async renderPageWithWatermark(
    documentId: string,
    masterKey: string,
    pageNo: number,
    watermark: WatermarkInfo,
  ): Promise<Buffer> {
    const base = await this.basePage(documentId, masterKey, pageNo);
    return this.applyWatermark(base, watermark);
  }

  private async basePage(
    documentId: string,
    masterKey: string,
    pageNo: number,
  ): Promise<Buffer> {
    const cacheKey = `pages/${documentId}/${pageNo}-x${RENDER_SCALE}.png`;
    if (await this.storage.exists(cacheKey)) {
      return this.storage.get(cacheKey);
    }

    const mupdf = await loadMupdf();
    const pdf = await this.storage.get(masterKey);
    const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
    try {
      const page = doc.loadPage(pageNo - 1); // mupdf 0-based
      const pixmap = page.toPixmap(
        mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE),
        mupdf.ColorSpace.DeviceRGB,
        false,
        true,
      );
      const png = Buffer.from(pixmap.asPNG());
      pixmap.destroy();
      page.destroy();

      await this.storage.put(cacheKey, png);
      return png;
    } finally {
      doc.destroy();
    }
  }

  private async applyWatermark(
    png: Buffer,
    info: WatermarkInfo,
  ): Promise<Buffer> {
    const image = sharp(png);
    const { width = 1200, height = 1600 } = await image.metadata();
    const stamp = `${info.name} • ${info.email}`;
    const time = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const svg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>text { font-family: Arial, sans-serif; }</style>
        <text x="50%" y="50%" text-anchor="middle"
              font-size="${Math.round(width / 28)}"
              fill="#1a2332" fill-opacity="0.12"
              transform="rotate(-30 ${width / 2} ${height / 2})">${escapeXml(stamp)}</text>
        <text x="50%" y="${height - 14}" text-anchor="middle"
              font-size="${Math.max(12, Math.round(width / 80))}"
              fill="#1a2332" fill-opacity="0.45">Populi Library — ${escapeXml(stamp)} — ${time} UTC</text>
      </svg>`);

    return image
      .composite([{ input: svg, top: 0, left: 0 }])
      .webp({ quality: 80 })
      .toBuffer();
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
