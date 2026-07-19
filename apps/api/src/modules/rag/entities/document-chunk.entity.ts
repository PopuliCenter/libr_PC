import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Potongan teks per-halaman hasil ekstraksi koleksi (bahan baku RAG — PRD P2).
 * Disimpan terpisah dari master; `pageNo` dipakai untuk rujukan ke protected reader.
 */
@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  documentId: string;

  @Column({ type: 'int' })
  pageNo: number;

  /** Urutan potongan dalam satu halaman (halaman panjang dipecah). */
  @Column({ type: 'int', default: 0 })
  chunkIndex: number;

  @Column({ type: 'text' })
  text: string;
}
