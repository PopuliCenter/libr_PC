import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../catalog/entities/document.entity';
import { ReadingSession } from '../reader/entities/reading-session.entity';

export interface Recommendation {
  title: string;
  slug: string;
  authors: string[];
  year: number | null;
  collectionType: string;
  category: string | null;
  /** Dasar rekomendasi: co-read (dibaca bersama), kategori, atau terbaru. */
  basis: 'coread' | 'category' | 'recent';
  coReads: number;
}

const SESSION_CAP = 20000;

/**
 * Rekomendasi bacaan (PRD P3) — "yang membaca ini juga membaca…".
 * Item-item collaborative filtering dari reading_sessions, dengan fallback
 * kategori & terbitan terbaru saat data baca masih jarang (cold-start).
 * Koleksi INTERNAL & koleksi sumber tak pernah direkomendasikan.
 */
@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(ReadingSession)
    private readonly sessions: Repository<ReadingSession>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
  ) {}

  async forDocument(documentId: string, limit = 5): Promise<Recommendation[]> {
    const [sessions, docs] = await Promise.all([
      this.sessions.find({ order: { createdAt: 'DESC' }, take: SESSION_CAP }),
      this.documents.find(),
    ]);
    const docById = new Map(docs.map((d) => [d.id, d]));
    const source = docById.get(documentId);

    const recommendable = (d?: Document): d is Document =>
      !!d && d.status === 'PUBLISHED' && d.accessType !== 'INTERNAL' && d.id !== documentId;

    // Pembaca koleksi sumber → koleksi lain yang mereka baca (co-read).
    const readers = new Set(
      sessions.filter((s) => s.documentId === documentId).map((s) => s.userId),
    );
    const coRead = tally(
      sessions
        .filter((s) => readers.has(s.userId) && s.documentId !== documentId)
        .map((s) => s.documentId),
    );
    const globalReads = tally(sessions.map((s) => s.documentId));

    const picks: { id: string; basis: Recommendation['basis'] }[] = [];
    const seen = new Set<string>();
    const add = (id: string, basis: Recommendation['basis']) => {
      if (seen.has(id) || picks.length >= limit) return;
      seen.add(id);
      picks.push({ id, basis });
    };

    // 1) Co-read, terurut frekuensi.
    for (const [id] of [...coRead.entries()].sort((a, b) => b[1] - a[1])) {
      if (recommendable(docById.get(id))) add(id, 'coread');
    }

    // 2) Fallback: kategori sama, terpopuler lalu terbaru.
    if (picks.length < limit && source?.category) {
      const sameCat = docs
        .filter((d) => recommendable(d) && d.category?.id === source.category!.id && !seen.has(d.id))
        .sort(
          (a, b) =>
            (globalReads.get(b.id) ?? 0) - (globalReads.get(a.id) ?? 0) ||
            +new Date(b.createdAt) - +new Date(a.createdAt),
        );
      for (const d of sameCat) add(d.id, 'category');
    }

    // 3) Fallback: terbitan terbaru.
    if (picks.length < limit) {
      const recent = docs
        .filter((d) => recommendable(d) && !seen.has(d.id))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      for (const d of recent) add(d.id, 'recent');
    }

    return picks.slice(0, limit).map(({ id, basis }) => {
      const d = docById.get(id)!;
      return {
        title: d.title,
        slug: d.slug,
        authors: d.authors ?? [],
        year: d.year,
        collectionType: d.collectionType,
        category: d.category?.name ?? null,
        basis,
        coReads: coRead.get(id) ?? 0,
      };
    });
  }
}

function tally(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}
