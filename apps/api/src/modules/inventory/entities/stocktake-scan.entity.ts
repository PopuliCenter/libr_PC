import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stocktake_scans')
export class StocktakeScan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  stocktakeId: string;

  /** Eksemplar yang cocok; null bila barcode tak dikenal. */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  physicalItemId: string | null;

  @Column()
  barcode: string;

  @Column()
  scannedById: string;

  @Column({ type: 'varchar', nullable: true })
  scannedLocation: string | null;

  /** UUID dari perangkat — idempotensi sinkron scan offline. */
  @Index({ unique: true })
  @Column()
  clientScanId: string;

  @CreateDateColumn()
  at: Date;
}
