import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type BatchStatus =
  | 'VALIDATING'
  | 'READY' // validasi selesai, menunggu konfirmasi admin
  | 'PROCESSING'
  | 'DONE'
  | 'FAILED';

export interface BatchTotals {
  total: number;
  valid: number;
  warning: number;
  error: number;
  created: number;
  skipped: number;
  failedItems: number;
}

@Entity('import_batches')
export class ImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @Column()
  filename: string;

  @Column({ type: 'varchar', default: 'VALIDATING' })
  status: BatchStatus;

  @Column({ type: 'simple-json', nullable: true })
  totals: BatchTotals | null;

  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'boolean', default: false })
  autoPublish: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
