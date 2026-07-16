import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DATETIME } from '../../../database/column-types';

@Entity('reading_sessions')
export class ReadingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  documentId: string;

  /** Terisi bila akses berasal dari peminjaman (tipe LOAN). */
  @Column({ type: 'varchar', nullable: true })
  loanId: string | null;

  @Column({ type: 'int', default: 1 })
  lastPage: number;

  @Column({ type: DATETIME })
  expiresAt: Date;

  @Column({ type: DATETIME, nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
