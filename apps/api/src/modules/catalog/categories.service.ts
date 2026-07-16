import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.repo.find({ relations: { parent: true } });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.repo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return category;
  }

  async create(name: string, parentId?: string): Promise<Category> {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    if (await this.repo.findOne({ where: { slug } })) {
      throw new ConflictException('Kategori dengan nama serupa sudah ada');
    }
    return this.repo.save(
      this.repo.create({
        name,
        slug,
        parent: parentId ? await this.findById(parentId) : null,
      }),
    );
  }

  /** Cari kategori berdasarkan nama (case-insensitive), buat bila belum ada. */
  async findOrCreate(name: string): Promise<Category> {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const existing = await this.repo.findOne({ where: { slug } });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ name, slug, parent: null }));
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(await this.findById(id));
  }
}
