import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DATETIME } from '../../../database/column-types';

export type StocktakeStatus = 'OPEN' | 'CLOSED';

export interface StocktakeSummary {
  totalItems: number;
  found: number;
  missing: number;
  misplaced: number;
  unknownScans: number;
}

@Entity('stocktakes')
export class Stocktake {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  startedById: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  status: StocktakeStatus;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: DATETIME, nullable: true })
  closedAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  summary: StocktakeSummary | null;
}
