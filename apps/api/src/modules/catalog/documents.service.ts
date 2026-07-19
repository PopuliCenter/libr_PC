import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  DOCUMENT_PUBLISHED,
  DocumentPublishedEvent,
} from '../notifications/events';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CategoriesService } from './categories.service';
import { Document } from './entities/document.entity';

/** Slugify sederhana (dipakai juga untuk mencocokkan subjek ke minat kategori). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

export interface PagedResult<T> {
  data: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    private readonly categoriesService: CategoriesService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Pencarian katalog publik — hanya koleksi PUBLISHED. Koleksi INTERNAL
   * disembunyikan kecuali `includeInternal` (peneliti internal / staf).
   */
  async search(
    query: QueryDocumentsDto,
    opts: { includeInternal?: boolean } = {},
  ): Promise<PagedResult<Document>> {
    const qb = this.baseQuery().andWhere('doc.status = :status', {
      status: 'PUBLISHED',
    });
    if (!opts.includeInternal) {
      qb.andWhere('doc.accessType != :internal', { internal: 'INTERNAL' });
    }
    this.applyFilters(qb, query);

    const [data, total] = await qb
      .orderBy('doc.createdAt', 'DESC')
      .skip((query.page - 1) * query.perPage)
      .take(query.perPage)
      .getManyAndCount();

    return {
      data,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.ceil(total / query.perPage),
      },
    };
  }

  /** Daftar untuk admin — semua status. */
  async adminList(query: QueryDocumentsDto): Promise<PagedResult<Document>> {
    const qb = this.baseQuery();
    this.applyFilters(qb, query);
    const [data, total] = await qb
      .orderBy('doc.updatedAt', 'DESC')
      .skip((query.page - 1) * query.perPage)
      .take(query.perPage)
      .getManyAndCount();
    return {
      data,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.ceil(total / query.perPage),
      },
    };
  }

  async findBySlug(slug: string, publishedOnly = true): Promise<Document> {
    const doc = await this.repo.findOne({ where: { slug } });
    if (!doc || (publishedOnly && doc.status !== 'PUBLISHED')) {
      throw new NotFoundException('Koleksi tidak ditemukan');
    }
    return doc;
  }

  async findById(id: string): Promise<Document> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Koleksi tidak ditemukan');
    return doc;
  }

  async create(dto: CreateDocumentDto): Promise<Document> {
    const { categoryId, ...rest } = dto;
    const doc = this.repo.create({
      ...rest,
      slug: await this.uniqueSlug(dto.title),
      category: categoryId
        ? await this.categoriesService.findById(categoryId)
        : null,
    });
    const saved = await this.repo.save(doc);
    return this.announceIfNewlyPublished(saved);
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const doc = await this.findById(id);
    const { categoryId, ...rest } = dto;
    Object.assign(doc, rest);
    if (categoryId !== undefined) {
      doc.category = categoryId
        ? await this.categoriesService.findById(categoryId)
        : null;
    }
    const saved = await this.repo.save(doc);
    return this.announceIfNewlyPublished(saved);
  }

  /**
   * Bila koleksi baru saja PUBLISHED dan belum pernah diumumkan, tandai
   * `announcedAt` (sekali seumur hidup → tak ada notifikasi ganda) lalu pancarkan
   * event agar anggota yang minatnya cocok diberi tahu.
   */
  private async announceIfNewlyPublished(doc: Document): Promise<Document> {
    if (doc.status !== 'PUBLISHED' || doc.announcedAt) return doc;
    doc.announcedAt = new Date();
    const saved = await this.repo.save(doc);
    this.events.emit(
      DOCUMENT_PUBLISHED,
      new DocumentPublishedEvent(saved.id, saved.title, saved.slug, this.topicsOf(saved)),
    );
    return saved;
  }

  /** Topik koleksi untuk pencocokan minat: slug kategori + subjek ter-slug. */
  private topicsOf(doc: Document): string[] {
    const topics = [
      doc.category?.slug,
      ...(doc.subjects ?? []).map(slugify),
    ].filter((t): t is string => Boolean(t));
    return [...new Set(topics)];
  }

  /** Dipanggil setelah upload PDF master berhasil. */
  async setDigitalFile(
    id: string,
    masterObjectKey: string,
    pageCount: number,
    checksum?: string,
  ): Promise<Document> {
    const doc = await this.findById(id);
    doc.masterObjectKey = masterObjectKey;
    doc.pageCount = pageCount;
    if (checksum) doc.sourceChecksum = checksum;
    return this.repo.save(doc);
  }

  /** Cek duplikat kandidat impor: PDF identik, ISBN sama, atau judul+tahun sama. */
  async findDuplicate(
    isbn: string | null,
    title: string,
    year: number | null,
  ): Promise<Document | null> {
    if (isbn) {
      const byIsbn = await this.repo.findOne({ where: { isbnIssn: isbn } });
      if (byIsbn) return byIsbn;
    }
    return this.repo
      .createQueryBuilder('doc')
      .where('LOWER(doc.title) = :title', { title: title.toLowerCase() })
      .andWhere(year === null ? 'doc.year IS NULL' : 'doc.year = :year', { year })
      .getOne();
  }

  findByChecksum(checksum: string): Promise<Document | null> {
    return this.repo.findOne({ where: { sourceChecksum: checksum } });
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findById(id);
    await this.repo.remove(doc);
  }

  /** Dipakai OAI-PMH: koleksi PUBLISHED terurut berdasarkan waktu ubah. */
  async listForHarvest(
    from: Date | null,
    until: Date | null,
    offset: number,
    limit: number,
  ): Promise<[Document[], number]> {
    const qb = this.baseQuery()
      .andWhere('doc.status = :status', { status: 'PUBLISHED' })
      // Koleksi INTERNAL tak pernah di-harvest ke jejaring nasional (PRD P1).
      .andWhere('doc.accessType != :internal', { internal: 'INTERNAL' });
    if (from) qb.andWhere('doc.updatedAt >= :from', { from });
    if (until) qb.andWhere('doc.updatedAt <= :until', { until });
    return qb
      .orderBy('doc.updatedAt', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
  }

  async earliestDatestamp(): Promise<Date> {
    const doc = await this.repo.findOne({
      where: { status: 'PUBLISHED' },
      order: { updatedAt: 'ASC' },
    });
    return doc?.updatedAt ?? new Date();
  }

  private baseQuery(): SelectQueryBuilder<Document> {
    return this.repo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.category', 'category');
  }

  private applyFilters(
    qb: SelectQueryBuilder<Document>,
    query: QueryDocumentsDto,
  ): void {
    if (query.query) {
      // SQLite dev: LIKE case-insensitive; PostgreSQL: upgrade ke tsvector/ILIKE.
      qb.andWhere(
        '(LOWER(doc.title) LIKE :q OR LOWER(doc.abstract) LIKE :q OR LOWER(doc.authors) LIKE :q OR LOWER(doc.subjects) LIKE :q)',
        { q: `%${query.query.toLowerCase()}%` },
      );
    }
    if (query.category) {
      qb.andWhere('category.slug = :categorySlug', {
        categorySlug: query.category,
      });
    }
    if (query.year) qb.andWhere('doc.year = :year', { year: query.year });
    if (query.type) {
      qb.andWhere('doc.collectionType = :type', { type: query.type });
    }
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80);
    let slug = base || 'koleksi';
    let i = 1;
    while (await this.repo.findOne({ where: { slug } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }
}
