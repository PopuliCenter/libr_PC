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

export type HoldStatus =
  | 'WAITING' // dalam antrian
  | 'OFFERED' // giliran tiba, menunggu diklaim (jendela 24 jam)
  | 'CLAIMED' // sudah dipinjam
  | 'CANCELLED' // dibatalkan anggota
  | 'EXPIRED'; // tawaran lewat tanpa diklaim

@Entity('holds')
export class Hold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => Document, { eager: true, onDelete: 'CASCADE' })
  document: Document;

  @Index()
  @Column({ type: 'varchar', default: 'WAITING' })
  status: HoldStatus;

  @CreateDateColumn()
  queuedAt: Date;

  @Column({ type: DATETIME, nullable: true })
  offeredAt: Date | null;

  @Column({ type: DATETIME, nullable: true })
  offerExpiresAt: Date | null;
}
