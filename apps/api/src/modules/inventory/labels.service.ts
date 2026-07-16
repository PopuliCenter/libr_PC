import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

/** Grid label 3 kolom × 8 baris pada A4. */
const COLS = 3;
const ROWS = 8;
const MARGIN = 28;

@Injectable()
export class LabelsService {
  /** Bangun PDF lembar stiker QR untuk daftar nomor induk. */
  async build(accessionNos: string[]): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const pageW = doc.page.width - MARGIN * 2;
    const pageH = doc.page.height - MARGIN * 2;
    const cellW = pageW / COLS;
    const cellH = pageH / ROWS;
    const perPage = COLS * ROWS;

    for (let i = 0; i < accessionNos.length; i++) {
      if (i > 0 && i % perPage === 0) doc.addPage();
      const idx = i % perPage;
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = MARGIN + col * cellW;
      const y = MARGIN + row * cellH;

      const acc = accessionNos[i];
      const qrPng = await QRCode.toBuffer(acc, { margin: 0, width: 120 });
      const qrSize = Math.min(cellW, cellH) - 34;
      doc.image(qrPng, x + (cellW - qrSize) / 2, y + 8, { width: qrSize });
      doc
        .fontSize(9)
        .fillColor('#1a2332')
        .text(acc, x, y + cellH - 22, { width: cellW, align: 'center' });
      doc
        .fontSize(6)
        .fillColor('#5b6779')
        .text('Populi Library', x, y + cellH - 12, {
          width: cellW,
          align: 'center',
        });
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
