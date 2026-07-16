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

export type ItemCondition =
  | 'BAIK'
  | 'RUSAK_RINGAN'
  | 'RUSAK_BERAT'
  | 'HILANG';

@Entity('physical_items')
export class PhysicalItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { eager: true, onDelete: 'CASCADE' })
  document: Document;

  /** Nomor induk unik, mis. PC-2026-00001. */
  @Index({ unique: true })
  @Column()
  accessionNo: string;

  /** ISBN sampul atau kode label internal; null bila tanpa barcode. */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', nullable: true })
  shelfLocation: string | null;

  @Column({ type: 'varchar', default: 'BAIK' })
  condition: ItemCondition;

  /** Sumber perolehan: beli / hibah / dll. */
  @Column({ type: 'varchar', nullable: true })
  acquisitionSource: string | null;

  @Column({ type: DATETIME, nullable: true })
  acquiredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
