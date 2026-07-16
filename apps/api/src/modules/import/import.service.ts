import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { CategoriesService } from '../catalog/categories.service';
import { DocumentsService } from '../catalog/documents.service';
import { AccessType, CollectionType } from '../catalog/entities/document.entity';
import { PdfRenderService } from '../reader/pdf-render.service';
import { StorageService } from '../storage/storage.service';
import {
  BatchTotals,
  ImportBatch,
} from './entities/import-batch.entity';
import {
  ImportItem,
  ItemPayload,
  ItemStatus,
} from './entities/import-item.entity';

const COLLECTION_TYPES = [
  'buku',
  'laporan',
  'jurnal',
  'prosiding',
  'dataset',
  'lainnya',
];
const ACCESS_TYPES = ['OPEN', 'MEMBER', 'LOAN'];

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(ImportBatch)
    private readonly batches: Repository<ImportBatch>,
    @InjectRepository(ImportItem)
    private readonly items: Repository<ImportItem>,
    private readonly storage: StorageService,
    private readonly documentsService: DocumentsService,
    private readonly categoriesService: CategoriesService,
    private readonly renderService: PdfRenderService,
  ) {}

  // ===== 1. Upload + validasi =====

  async createBatch(
    adminId: string,
    zipBuffer: Buffer,
    filename: string,
  ): Promise<{ batch: ImportBatch; items: ImportItem[] }> {
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch {
      throw new BadRequestException('Berkas ZIP tidak dapat dibaca');
    }

    const entries = zip.getEntries().filter((e) => !e.isDirectory);
    const xlsxEntry = entries.find((e) =>
      e.entryName.toLowerCase().endsWith('.xlsx'),
    );
    if (!xlsxEntry) {
      throw new BadRequestException('ZIP tidak memuat berkas template .xlsx');
    }

    // Peta nama PDF → buffer (pakai basename agar cocok walau di dalam folder).
    // Entri rusak (CRC gagal) dilewati; barisnya nanti ditandai ERROR.
    const pdfs = new Map<string, Buffer>();
    for (const e of entries) {
      if (!e.entryName.toLowerCase().endsWith('.pdf')) continue;
      try {
        pdfs.set(basename(e.entryName), e.getData());
      } catch {
        this.logger.warn(`Entri PDF rusak dilewati: ${e.entryName}`);
      }
    }

    let xlsxBuf: Buffer;
    try {
      xlsxBuf = xlsxEntry.getData();
    } catch {
      throw new BadRequestException(
        'Berkas template .xlsx di dalam ZIP rusak (checksum gagal). Kompres ulang lalu unggah kembali.',
      );
    }
    const rows = await this.parseSheet(xlsxBuf);
    if (rows.length === 0) {
      throw new BadRequestException(
        'Sheet "Koleksi" kosong atau format kolom tidak dikenali',
      );
    }

    const batch = await this.batches.save(
      this.batches.create({ adminId, filename, status: 'VALIDATING' }),
    );

    // Deteksi nama_file ganda dalam batch (pemetaan ambigu).
    const nameCount = new Map<string, number>();
    for (const r of rows) {
      const n = (r.namaFile || '').toLowerCase();
      if (n) nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
    }
    const checksumSeen = new Set<string>();

    const items: ImportItem[] = [];
    for (let i = 0; i < rows.length; i++) {
      const payload = rows[i];
      const messages: string[] = [];
      let status: ItemStatus = 'VALID';
      let pdfObjectKey: string | null = null;
      let checksum: string | null = null;

      const err = (m: string) => {
        messages.push(m);
        status = 'ERROR';
      };
      const warn = (m: string) => {
        messages.push(m);
        if (status !== 'ERROR') status = 'WARNING';
      };

      // Wajib.
      if (!payload.judul) err('Kolom "judul" wajib diisi');
      if (payload.penulis.length === 0) err('Kolom "penulis" wajib diisi');
      if (!payload.kategori) err('Kolom "kategori" wajib diisi');
      if (!payload.namaFile) err('Kolom "nama_file" wajib diisi');

      // Tipe koleksi & akses.
      if (!COLLECTION_TYPES.includes(payload.tipeKoleksi)) {
        warn(`tipe_koleksi "${payload.tipeKoleksi}" tidak dikenal → dipakai "lainnya"`);
        payload.tipeKoleksi = 'lainnya';
      }
      if (!ACCESS_TYPES.includes(payload.tipeAkses)) {
        err(`tipe_akses "${payload.tipeAkses}" tidak valid (OPEN/MEMBER/LOAN)`);
      }
      if (payload.tipeAkses === 'LOAN') {
        if (!payload.jumlahLisensi || payload.jumlahLisensi < 1) {
          err('tipe_akses LOAN memerlukan jumlah_lisensi ≥ 1');
        }
        if (payload.durasiSewa.length === 0) {
          err('tipe_akses LOAN memerlukan durasi_sewa_hari');
        }
      }

      // File PDF.
      if (payload.namaFile) {
        if ((nameCount.get(payload.namaFile.toLowerCase()) ?? 0) > 1) {
          err(`nama_file "${payload.namaFile}" dipakai lebih dari satu baris`);
        } else if (!pdfs.has(payload.namaFile)) {
          err(`PDF "${payload.namaFile}" tidak ditemukan di dalam ZIP`);
        } else {
          const buf = pdfs.get(payload.namaFile)!;
          if (!buf.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
            err(`"${payload.namaFile}" bukan berkas PDF yang valid`);
          } else {
            checksum = createHash('sha256').update(buf).digest('hex');
            if (checksumSeen.has(checksum)) {
              warn('PDF identik dengan baris lain dalam batch ini');
            }
            checksumSeen.add(checksum);
            if (await this.documentsService.findByChecksum(checksum)) {
              warn('PDF identik sudah pernah diimpor — akan dilewati');
            }
            pdfObjectKey = `imports/${batch.id}/${payload.namaFile}`;
            await this.storage.put(pdfObjectKey, buf);
          }
        }
      }

      // Duplikat metadata di DB.
      if ((status as ItemStatus) !== 'ERROR' && payload.judul) {
        const dup = await this.documentsService.findDuplicate(
          payload.isbnIssn,
          payload.judul,
          payload.tahun,
        );
        if (dup) warn('Judul/ISBN serupa sudah ada di katalog');
      }

      items.push(
        this.items.create({
          batchId: batch.id,
          rowNo: i + 2, // baris 1 = header
          payload,
          pdfObjectKey,
          checksum,
          status,
          messages,
        }),
      );
    }

    await this.items.save(items);
    batch.totals = this.tally(items);
    batch.status = 'READY';
    await this.batches.save(batch);

    return { batch, items };
  }

  // ===== 2. Konfirmasi & proses background =====

  async commit(
    batchId: string,
    autoPublish: boolean,
  ): Promise<ImportBatch> {
    const batch = await this.getBatchOrThrow(batchId);
    if (batch.status !== 'READY') {
      throw new BadRequestException('Batch tidak dalam status siap diproses');
    }
    batch.status = 'PROCESSING';
    batch.autoPublish = autoPublish;
    await this.batches.save(batch);

    // Jalankan tanpa memblokir respons; UI memantau via getBatch.
    void this.processBatch(batchId).catch((err) =>
      this.logger.error(`Proses batch ${batchId} gagal: ${err.message}`),
    );
    return batch;
  }

  private async processBatch(batchId: string): Promise<void> {
    const batch = await this.getBatchOrThrow(batchId);
    const targets = await this.items.find({
      where: { batchId },
    });

    for (const item of targets) {
      if (item.status !== 'VALID' && item.status !== 'WARNING') continue;
      item.status = 'PROCESSING';
      await this.items.save(item);
      try {
        await this.createDocument(item, batch.autoPublish);
      } catch (err) {
        item.status = 'FAILED';
        item.messages = [...item.messages, (err as Error).message];
        await this.items.save(item);
      }
    }

    const refreshed = await this.items.find({ where: { batchId } });
    batch.totals = this.tally(refreshed);
    batch.status = 'DONE';
    await this.batches.save(batch);
    this.logger.log(`Batch ${batchId} selesai diproses`);
  }

  private async createDocument(
    item: ImportItem,
    autoPublish: boolean,
  ): Promise<void> {
    if (!item.pdfObjectKey || !item.checksum) {
      throw new Error('Berkas PDF tidak tersedia');
    }
    // Idempotensi: lewati bila PDF identik sudah ada di katalog.
    if (await this.documentsService.findByChecksum(item.checksum)) {
      item.status = 'SKIPPED';
      item.messages = [...item.messages, 'Dilewati: sudah ada di katalog'];
      await this.items.save(item);
      return;
    }

    const buf = await this.storage.get(item.pdfObjectKey);
    const pageCount = await this.renderService.pageCount(buf);
    const p = item.payload;
    const category = await this.categoriesService.findOrCreate(p.kategori);

    const doc = await this.documentsService.create({
      title: p.judul,
      authors: p.penulis,
      publisher: p.penerbit ?? undefined,
      year: p.tahun ?? undefined,
      isbnIssn: p.isbnIssn ?? undefined,
      collectionType: p.tipeKoleksi as CollectionType,
      language: p.bahasa,
      abstract: p.abstrak ?? undefined,
      callNumber: p.noPanggil ?? undefined,
      subjects: p.subjek,
      categoryId: category.id,
      accessType: p.tipeAkses as AccessType,
      licenseCount: p.jumlahLisensi ?? 1,
      loanDurations: p.durasiSewa.length ? p.durasiSewa : undefined,
      previewPages: p.halamanPreview ?? 0,
      status: autoPublish ? 'PUBLISHED' : 'DRAFT',
    });

    const masterKey = `masters/${doc.id}.pdf`;
    await this.storage.put(masterKey, buf);
    await this.documentsService.setDigitalFile(
      doc.id,
      masterKey,
      pageCount,
      item.checksum,
    );

    item.status = 'CREATED';
    item.documentId = doc.id;
    await this.items.save(item);
  }

  // ===== 3. Status & laporan =====

  async getBatch(
    batchId: string,
  ): Promise<{ batch: ImportBatch; items: ImportItem[] }> {
    const batch = await this.getBatchOrThrow(batchId);
    const items = await this.items.find({
      where: { batchId },
      order: { rowNo: 'ASC' },
    });
    return { batch, items };
  }

  listBatches(): Promise<ImportBatch[]> {
    return this.batches.find({ order: { createdAt: 'DESC' }, take: 50 });
  }

  async buildReport(batchId: string): Promise<Buffer> {
    const { items } = await this.getBatch(batchId);
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Laporan Impor');
    sheet.columns = [
      { header: 'Baris', key: 'row', width: 8 },
      { header: 'nama_file', key: 'file', width: 26 },
      { header: 'Judul', key: 'judul', width: 40 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Catatan', key: 'msg', width: 60 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const it of items) {
      sheet.addRow({
        row: it.rowNo,
        file: it.payload.namaFile,
        judul: it.payload.judul,
        status: it.status,
        msg: it.messages.join(' | '),
      });
    }
    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  // ===== Pembantu =====

  private async parseSheet(xlsx: Buffer): Promise<ItemPayload[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx as unknown as ArrayBuffer);
    const sheet = wb.getWorksheet('Koleksi') ?? wb.worksheets[0];
    if (!sheet) return [];

    // Peta header → indeks kolom (baris 1).
    const colIndex = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, col) => {
      colIndex.set(cellStr(cell).toLowerCase().trim(), col);
    });
    const get = (row: ExcelJS.Row, key: string): string => {
      const idx = colIndex.get(key);
      return idx ? cellStr(row.getCell(idx)) : '';
    };

    const rows: ItemPayload[] = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const judul = get(row, 'judul').trim();
      const namaFile = get(row, 'nama_file').trim();
      // Lewati baris kosong sepenuhnya.
      if (!judul && !namaFile) continue;

      rows.push({
        namaFile,
        judul,
        penulis: splitList(get(row, 'penulis'), /;/),
        tahun: parseYear(get(row, 'tahun')),
        tipeKoleksi: get(row, 'tipe_koleksi').toLowerCase().trim() || 'buku',
        kategori: get(row, 'kategori').trim(),
        tipeAkses: get(row, 'tipe_akses').toUpperCase().trim() || 'MEMBER',
        jumlahLisensi: parseIntOrNull(get(row, 'jumlah_lisensi')),
        durasiSewa: splitList(get(row, 'durasi_sewa_hari'), /[,;]/)
          .map((x) => parseInt(x, 10))
          .filter((n) => Number.isFinite(n) && n > 0),
        penerbit: get(row, 'penerbit').trim() || null,
        isbnIssn: get(row, 'isbn_issn').trim() || null,
        bahasa: get(row, 'bahasa').toLowerCase().trim() || 'id',
        subjek: splitList(get(row, 'subjek'), /;/),
        abstrak: get(row, 'abstrak').trim() || null,
        noPanggil: get(row, 'no_panggil').trim() || null,
        halamanPreview: parseIntOrNull(get(row, 'halaman_preview')),
      });
    }
    return rows;
  }

  private tally(items: ImportItem[]): BatchTotals {
    const c = (s: ItemStatus) => items.filter((i) => i.status === s).length;
    return {
      total: items.length,
      valid: c('VALID'),
      warning: c('WARNING'),
      error: c('ERROR'),
      created: c('CREATED'),
      skipped: c('SKIPPED'),
      failedItems: c('FAILED'),
    };
  }

  private async getBatchOrThrow(id: string): Promise<ImportBatch> {
    const batch = await this.batches.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Batch impor tidak ditemukan');
    return batch;
  }
}

// ===== util modul =====

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell?.value as unknown;
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return String(v.getFullYear());
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.result !== 'undefined') return String(o.result);
    if (Array.isArray(o.richText)) {
      return (o.richText as { text: string }[]).map((t) => t.text).join('');
    }
  }
  return String(v);
}

function splitList(s: string, sep: RegExp): string[] {
  return s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseYear(s: string): number | null {
  const m = s.match(/(1[0-9]{3}|20[0-9]{2})/);
  return m ? parseInt(m[0], 10) : null;
}

function parseIntOrNull(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
