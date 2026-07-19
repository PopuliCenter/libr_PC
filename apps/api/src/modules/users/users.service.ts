import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findOne({ where: { googleId } });
  }

  /** Cari pengguna untuk admin (email/nama). Maks 100 terbaru. */
  search(query?: string): Promise<User[]> {
    const qb = this.repo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC').take(100);
    if (query?.trim()) {
      const like = `%${query.trim().toLowerCase()}%`;
      qb.where('LOWER(u.email) LIKE :like OR LOWER(u.name) LIKE :like', { like });
    }
    return qb.getMany();
  }

  /**
   * Anggota aktif yang setuju newsletter dan minatnya beririsan dengan `topics`.
   * `interests` disimpan sebagai JSON teks (portabel SQLite/PostgreSQL), maka
   * irisan dihitung di aplikasi. Skala Fase 1 kecil; bila membesar, pindah ke
   * kolom relasional/GIN index + query set.
   */
  async findNewsletterRecipients(topics: string[]): Promise<User[]> {
    if (topics.length === 0) return [];
    const wanted = new Set(topics);
    const candidates = await this.repo.find({
      where: { newsletterConsent: true, status: 'active' },
    });
    return candidates.filter((u) =>
      (u.interests ?? []).some((i) => wanted.has(i)),
    );
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.repo.create({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    Object.assign(user, data);
    return this.repo.save(user);
  }

  async setStatus(id: string, status: UserStatus): Promise<User> {
    return this.update(id, { status });
  }
}
