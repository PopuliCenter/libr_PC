import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DATETIME } from '../../../database/column-types';

export interface IsbnMetadata {
  title: string;
  authors: string[];
  publisher: string | null;
  year: number | null;
  coverUrl: string | null;
}

/** Cache hasil lookup ISBN agar scan ulang tidak memanggil API eksternal. */
@Entity('isbn_cache')
export class IsbnCache {
  @PrimaryColumn()
  isbn: string;

  @Column({ type: 'simple-json' })
  payload: IsbnMetadata;

  @Column({ type: 'varchar' })
  source: 'google_books' | 'open_library' | 'manual';

  @Column({ type: DATETIME })
  fetchedAt: Date;
}
