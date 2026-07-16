import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Null untuk aksi anonim (mis. registrasi). */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  actorId: string | null;

  @Index()
  @Column()
  action: string;

  @Index()
  @Column()
  entity: string;

  @Column({ type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'simple-json', nullable: true })
  meta: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
