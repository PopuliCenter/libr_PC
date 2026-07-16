import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CategoriesService } from '../catalog/categories.service';
import { DocumentsService } from '../catalog/documents.service';
import { Document } from '../catalog/entities/document.entity';
import { PhysicalItem, ItemCondition } from './entities/physical-item.entity';
import { Stocktake, StocktakeSummary } from './entities/stocktake.entity';
import { StocktakeScan } from './entities/stocktake-scan.entity';

export interface RegisterItemInput {
  documentId?: string;
  isbn?: string;
  title?: string;
  authors?: string[];
  publisher?: string;
  year?: number;
  categoryName?: string;
  collectionType?: string;
  shelfLocation?: string;
  condition?: ItemCondition;
  acquisitionSource?: string;
  acquiredAt?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(PhysicalItem)
    private readonly items: Repository<PhysicalItem>,
    @InjectRepository(Stocktake)
    private readonly stocktakes: Repository<Stocktake>,
    @InjectRepository(StocktakeScan)
    private readonly scans: Repository<StocktakeScan>,
    private readonly documentsService: DocumentsService,
    private readonly categoriesService: CategoriesService,
    private readonly dataSource: DataSource,
  ) {}

  // ===== Pendataan eksemplar =====

  async register(input: RegisterItemInput) {
    return this.dataSource.transaction(async (manager) => {
      // Tentukan dokumen: eksplisit → berdasarkan ISBN → buat baru.
      let doc: Document | null = null;
      let isNewDocument = false;

      if (input.documentId) {
        doc = await this.documentsService.findById(input.documentId);
      } else if (input.isbn) {
        doc = await this.documentsService.findDuplicate(
          normIsbn(input.isbn),
          input.title ?? '',
          input.year ?? null,
        );
      }

      if (!doc) {
        if (!input.title) {
          throw new BadRequestException(
            'Judul wajib diisi untuk koleksi baru',
          );
        }
        const category = await this.categoriesService.findOrCreate(
          input.categoryName || 'Lainnya',
        );
        doc = await this.documentsService.create({
          title: input.title,
          authors: input.authors?.length ? input.authors : ['Tidak diketahui'],
          publisher: input.publisher,
          year: input.year,
          isbnIssn: input.isbn ? normIsbn(input.isbn) : undefined,
          collectionType: (input.collectionType as any) ?? 'buku',
          categoryId: category.id,
          accessType: 'MEMBER',
          status: 'PUBLISHED',
        });
        isNewDocument = true;
      }

      const accessionNo = await this.nextAccession(manager);
      const item = await manager.getRepository(PhysicalItem).save(
        manager.getRepository(PhysicalItem).create({
          document: doc,
          accessionNo,
          barcode: input.isbn ? normIsbn(input.isbn) : accessionNo,
          shelfLocation: input.shelfLocation ?? null,
          condition: input.condition ?? 'BAIK',
          acquisitionSource: input.acquisitionSource ?? null,
          acquiredAt: input.acquiredAt ? new Date(input.acquiredAt) : null,
        }),
      );

      // Jaga sinkron hitungan eksemplar di katalog.
      const count = await manager.getRepository(PhysicalItem).count({
        where: { document: { id: doc.id } },
      });
      await manager.getRepository(Document).update(doc.id, {
        physicalCopies: count,
      });

      return {
        physicalItem: item,
        document: { id: doc.id, title: doc.title, slug: doc.slug },
        isNewDocument,
      };
    });
  }

  listItems(documentId?: string): Promise<PhysicalItem[]> {
    const qb = this.items
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.document', 'document')
      .orderBy('item.createdAt', 'DESC')
      .take(200);
    if (documentId) qb.where('document.id = :documentId', { documentId });
    return qb.getMany();
  }

  async findByCode(code: string): Promise<PhysicalItem | null> {
    const c = code.trim();
    const byAccession = await this.items.findOne({
      where: { accessionNo: c },
    });
    if (byAccession) return byAccession;
    const isbn = normIsbn(c);
    if (isbn.length >= 10) {
      return this.items.findOne({ where: { barcode: isbn } });
    }
    return null;
  }

  async inventoryReport(): Promise<Buffer> {
    const items = await this.listItems();
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Inventaris');
    sheet.columns = [
      { header: 'No. Induk', key: 'acc', width: 16 },
      { header: 'Judul', key: 'judul', width: 40 },
      { header: 'Barcode/ISBN', key: 'bc', width: 18 },
      { header: 'Lokasi Rak', key: 'lok', width: 14 },
      { header: 'Kondisi', key: 'kond', width: 14 },
      { header: 'Sumber', key: 'sum', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const it of items) {
      sheet.addRow({
        acc: it.accessionNo,
        judul: it.document?.title ?? '—',
        bc: it.barcode ?? '—',
        lok: it.shelfLocation ?? '—',
        kond: it.condition,
        sum: it.acquisitionSource ?? '—',
      });
    }
    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  // ===== Stock opname =====

  createStocktake(name: string, userId: string): Promise<Stocktake> {
    return this.stocktakes.save(
      this.stocktakes.create({
        name: name || `Opname ${new Date().toISOString().slice(0, 10)}`,
        startedById: userId,
        status: 'OPEN',
      }),
    );
  }

  async scan(
    stocktakeId: string,
    userId: string,
    barcode: string,
    clientScanId: string,
    scannedLocation?: string,
  ) {
    const st = await this.getStocktake(stocktakeId);
    if (st.status !== 'OPEN') {
      throw new BadRequestException('Sesi opname sudah ditutup');
    }
    // Idempotensi: scan dgn client_scan_id sama diabaikan (sinkron offline).
    const existing = await this.scans.findOne({ where: { clientScanId } });
    if (existing) {
      return this.scanResult(existing);
    }

    const item = await this.findByCode(barcode);
    const scan = await this.scans.save(
      this.scans.create({
        stocktakeId,
        physicalItemId: item?.id ?? null,
        barcode: barcode.trim(),
        scannedById: userId,
        scannedLocation: scannedLocation ?? null,
        clientScanId,
      }),
    );
    return this.scanResult(scan, item);
  }

  async closeStocktake(stocktakeId: string): Promise<Stocktake> {
    const st = await this.getStocktake(stocktakeId);
    if (st.status === 'CLOSED') return st;

    const allItems = await this.items.find();
    const scans = await this.scans.find({ where: { stocktakeId } });

    const scannedItemIds = new Set(
      scans.map((s) => s.physicalItemId).filter(Boolean) as string[],
    );
    const locByItem = new Map<string, string | null>();
    for (const s of scans) {
      if (s.physicalItemId) locByItem.set(s.physicalItemId, s.scannedLocation);
    }

    let misplaced = 0;
    for (const it of allItems) {
      if (!scannedItemIds.has(it.id)) continue;
      const scannedLoc = locByItem.get(it.id);
      if (scannedLoc && it.shelfLocation && scannedLoc !== it.shelfLocation) {
        misplaced++;
      }
    }

    const summary: StocktakeSummary = {
      totalItems: allItems.length,
      found: scannedItemIds.size,
      missing: allItems.length - scannedItemIds.size,
      misplaced,
      unknownScans: scans.filter((s) => !s.physicalItemId).length,
    };

    st.status = 'CLOSED';
    st.closedAt = new Date();
    st.summary = summary;
    return this.stocktakes.save(st);
  }

  async getStocktakeDetail(stocktakeId: string) {
    const stocktake = await this.getStocktake(stocktakeId);
    const scans = await this.scans.find({
      where: { stocktakeId },
      order: { at: 'DESC' },
    });
    const scannedItemIds = new Set(
      scans.map((s) => s.physicalItemId).filter(Boolean) as string[],
    );
    // Hitung ringkasan langsung agar sesi berjalan pun tampil live.
    const totalItems = await this.items.count();
    return {
      stocktake,
      scanCount: scans.length,
      recentScans: scans.slice(0, 20),
      live: {
        totalItems,
        found: scannedItemIds.size,
        remaining: totalItems - scannedItemIds.size,
        unknownScans: scans.filter((s) => !s.physicalItemId).length,
      },
    };
  }

  listStocktakes(): Promise<Stocktake[]> {
    return this.stocktakes.find({ order: { startedAt: 'DESC' }, take: 50 });
  }

  async stocktakeReport(stocktakeId: string): Promise<Buffer> {
    const st = await this.getStocktake(stocktakeId);
    const allItems = await this.listItems();
    const scans = await this.scans.find({ where: { stocktakeId } });
    const scanned = new Map<string, StocktakeScan>();
    for (const s of scans) if (s.physicalItemId) scanned.set(s.physicalItemId, s);

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Hasil Opname');
    sheet.columns = [
      { header: 'No. Induk', key: 'acc', width: 16 },
      { header: 'Judul', key: 'judul', width: 40 },
      { header: 'Lokasi Tercatat', key: 'loc', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const it of allItems) {
      const s = scanned.get(it.id);
      let status = 'HILANG';
      if (s) {
        status =
          s.scannedLocation && it.shelfLocation && s.scannedLocation !== it.shelfLocation
            ? 'SALAH LOKASI'
            : 'DITEMUKAN';
      }
      sheet.addRow({
        acc: it.accessionNo,
        judul: it.document?.title ?? '—',
        loc: it.shelfLocation ?? '—',
        status,
      });
    }
    sheet.addRow({});
    sheet.addRow({ acc: 'Sesi', judul: st.name, status: st.status });
    return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  }

  // ===== pembantu =====

  private async nextAccession(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PC-${year}-`;
    const last = await manager
      .getRepository(PhysicalItem)
      .createQueryBuilder('item')
      .where('item.accessionNo LIKE :p', { p: `${prefix}%` })
      .orderBy('item.accessionNo', 'DESC')
      .getOne();
    const nextSeq = last
      ? parseInt(last.accessionNo.slice(prefix.length), 10) + 1
      : 1;
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  private async getStocktake(id: string): Promise<Stocktake> {
    const st = await this.stocktakes.findOne({ where: { id } });
    if (!st) throw new NotFoundException('Sesi opname tidak ditemukan');
    return st;
  }

  private scanResult(scan: StocktakeScan, item?: PhysicalItem | null) {
    return {
      accepted: true,
      recognized: !!scan.physicalItemId,
      title: item?.document?.title ?? null,
      accessionNo: item?.accessionNo ?? null,
    };
  }
}

function normIsbn(s: string): string {
  return s.replace(/[^0-9Xx]/g, '').toUpperCase();
}
