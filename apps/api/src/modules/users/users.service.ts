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
