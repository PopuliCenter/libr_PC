import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * Membuat akun superadmin pertama bila belum ada, dari env
 * ADMIN_EMAIL / ADMIN_PASSWORD. Tanpa ini tidak ada yang bisa
 * masuk panel admin pada instalasi baru.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.repo.findOne({
      where: { role: 'superadmin' },
    });
    if (existing) return;

    const email = this.config.get<string>(
      'ADMIN_EMAIL',
      'admin@populicenter.org',
    );
    const password = this.config.get<string>('ADMIN_PASSWORD', 'admin12345');

    await this.repo.save(
      this.repo.create({
        name: 'Super Admin',
        email: email.toLowerCase(),
        passwordHash: await argon2.hash(password),
        role: 'superadmin',
        status: 'active',
        emailVerifiedAt: new Date(),
      }),
    );
    this.logger.warn(
      `Superadmin awal dibuat: ${email}. SEGERA ganti password default via env ADMIN_PASSWORD.`,
    );
  }
}
