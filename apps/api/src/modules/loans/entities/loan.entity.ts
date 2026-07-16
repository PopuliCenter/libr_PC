import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DATETIME } from '../../../database/column-types';
import { Document } from '../../catalog/entities/document.entity';

export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'EXPIRED';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => Document, { eager: true, onDelete: 'CASCADE' })
  document: Document;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: LoanStatus;

  @Column({ type: 'int' })
  durationDays: number;

  @CreateDateColumn()
  borrowedAt: Date;

  @Index()
  @Column({ type: DATETIME })
  expiresAt: Date;

  @Column({ type: DATETIME, nullable: true })
  returnedAt: Date | null;
}
