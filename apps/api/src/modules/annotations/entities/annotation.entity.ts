import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Anotasi/catatan pribadi anggota atas sebuah halaman koleksi (PRD P5).
 * Disimpan per akun di basis data — BUKAN di berkas PDF — sehingga proteksi
 * (DRM/watermark) master tetap utuh.
 */
@Entity('annotations')
export class Annotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  documentId: string;

  @Column({ type: 'int' })
  pageNo: number;

  @Column({ type: 'text' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
