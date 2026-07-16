import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CategoriesService } from './categories.service';
import { Document } from './entities/document.entity';

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
  ) {}

  /** Pencarian katalog publik — hanya koleksi PUBLISHED. */
  async search(query: QueryDocumentsDto): Promise<PagedResult<Document>> {
    const qb = this.baseQuery().andWhere('doc.status = :status', {
      status: 'PUBLISHED',
    });
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
    return this.repo.save(doc);
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
    return this.repo.save(doc);
  }

  /** Dipanggil setelah upload PDF master berhasil. */
  async setDigitalFile(
    id: string,
    masterObjectKey: string,
    pageCount: number,
  ): Promise<Document> {
    const doc = await this.findById(id);
    doc.masterObjectKey = masterObjectKey;
    doc.pageCount = pageCount;
    return this.repo.save(doc);
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
    const qb = this.baseQuery().andWhere('doc.status = :status', {
      status: 'PUBLISHED',
    });
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
