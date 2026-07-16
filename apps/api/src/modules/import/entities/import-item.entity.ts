import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ItemStatus =
  | 'VALID'
  | 'WARNING'
  | 'ERROR'
  | 'PROCESSING'
  | 'CREATED'
  | 'SKIPPED' // duplikat (PDF identik sudah ada) → dilewati saat impor
  | 'FAILED';

/** Metadata satu baris template, hasil parsing. */
export interface ItemPayload {
  namaFile: string;
  judul: string;
  penulis: string[];
  tahun: number | null;
  tipeKoleksi: string;
  kategori: string;
  tipeAkses: string;
  jumlahLisensi: number | null;
  durasiSewa: number[];
  penerbit: string | null;
  isbnIssn: string | null;
  bahasa: string;
  subjek: string[];
  abstrak: string | null;
  noPanggil: string | null;
  halamanPreview: number | null;
}

@Entity('import_items')
export class ImportItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  batchId: string;

  @Column({ type: 'int' })
  rowNo: number;

  @Column({ type: 'simple-json' })
  payload: ItemPayload;

  @Column({ type: 'varchar', nullable: true })
  pdfObjectKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  checksum: string | null;

  @Column({ type: 'varchar' })
  status: ItemStatus;

  @Column({ type: 'simple-json', default: '[]' })
  messages: string[];

  @Column({ type: 'varchar', nullable: true })
  documentId: string | null;
}
