import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditRecord {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ip?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface AuditQuery {
  actorId?: string;
  action?: string;
  entity?: string;
  page: number;
  perPage: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(entry: AuditRecord): Promise<AuditLog> {
    return this.repo.save(this.repo.create(entry));
  }

  async query(q: AuditQuery) {
    const where: Record<string, unknown> = {};
    if (q.actorId) where.actorId = q.actorId;
    if (q.action) where.action = q.action;
    if (q.entity) where.entity = q.entity;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (q.page - 1) * q.perPage,
      take: q.perPage,
    });
    return {
      data,
      meta: {
        page: q.page,
        perPage: q.perPage,
        total,
        totalPages: Math.ceil(total / q.perPage),
      },
    };
  }
}
