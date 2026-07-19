import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DATETIME } from '../../../database/column-types';
import { Category } from './category.entity';

export type AccessType = 'OPEN' | 'MEMBER' | 'LOAN' | 'INTERNAL';
export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CollectionType =
  | 'buku'
  | 'laporan'
  | 'jurnal'
  | 'prosiding'
  | 'dataset'
  | 'video'
  | 'audio'
  | 'lainnya';
export type CopyrightStatus = 'OWNED' | 'LICENSED' | 'UNCLEARED';

/** Jenis tautan terkait (untuk ikon/label & pemilihan embed). */
export type RelatedLinkKind =
  | 'video'
  | 'podcast'
  | 'news'
  | 'slides'
  | 'dataset'
  | 'event'
  | 'other';

/** Tautan peluncuran/diskusi/multimedia terkait koleksi (PRD I4). */
export interface RelatedLink {
  kind: RelatedLinkKind;
  title: string;
  url: string;
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  title: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  /** Daftar penulis (disimpan JSON agar portabel SQLite/PostgreSQL). */
  @Column({ type: 'simple-json' })
  authors: string[];

  @Column({ type: 'varchar', nullable: true })
  publisher: string | null;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'varchar', nullable: true })
  isbnIssn: string | null;

  @Column({ type: 'varchar', default: 'buku' })
  collectionType: CollectionType;

  @Column({ type: 'varchar', default: 'id' })
  language: string;

  @Column({ type: 'text', nullable: true })
  abstract: string | null;

  @Column({ type: 'varchar', nullable: true })
  callNumber: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  subjects: string[];

  /** Tautan peluncuran/diskusi/multimedia terkait (PRD I4). */
  @Column({ type: 'simple-json', default: '[]' })
  relatedLinks: RelatedLink[];

  @ManyToOne(() => Category, { nullable: true, eager: true, onDelete: 'SET NULL' })
  category: Category | null;

  @Column({ type: 'varchar', default: 'MEMBER' })
  accessType: AccessType;

  @Column({ type: 'int', default: 1 })
  licenseCount: number;

  /** Pilihan durasi sewa dalam hari, mis. [1,3,7]. */
  @Column({ type: 'simple-json', default: '[3,7]' })
  loanDurations: number[];

  @Column({ type: 'int', default: 0 })
  previewPages: number;

  /** Jumlah eksemplar fisik di rak (dari inventaris; detail per-eksemplar menyusul di modul F7). */
  @Column({ type: 'int', default: 0 })
  physicalCopies: number;

  @Column({ type: 'int', nullable: true })
  pageCount: number | null;

  @Index()
  @Column({ type: 'varchar', default: 'DRAFT' })
  status: DocumentStatus;

  @Column({ type: 'varchar', default: 'OWNED' })
  copyrightStatus: CopyrightStatus;

  /** Kunci objek file PDF master di storage (null bila belum ada versi digital). */
  @Column({ type: 'varchar', nullable: true })
  masterObjectKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  coverObjectKey: string | null;

  /** SHA-256 file PDF master — untuk deteksi impor ganda (idempotensi). */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  sourceChecksum: string | null;

  /** Diisi sekali saat pengumuman "terbitan baru" dikirim (idempotensi — PRD I6). */
  @Column({ type: DATETIME, nullable: true })
  announcedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
