import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../catalog/entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

export interface Passage {
  documentId: string;
  title: string;
  slug: string;
  pageNo: number;
  snippet: string;
  score: number;
}

const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'atau', 'ini',
  'itu', 'apa', 'apakah', 'bagaimana', 'adalah', 'para', 'oleh', 'akan', 'the',
  'and', 'for', 'are', 'what', 'how', 'about', 'with', 'from', 'this', 'that',
]);
const CANDIDATE_CAP = 400;

/**
 * Retrieval leksikal (BM25-lite) atas potongan teks koleksi (PRD P2). Portabel
 * SQLite/PostgreSQL. Koleksi INTERNAL tak pernah diambil (konsisten dgn P1).
 * Dirancang agar retriever berbasis embedding bisa menggantikan kelak.
 */
@Injectable()
export class RetrievalService {
  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunks: Repository<DocumentChunk>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
  ) {}

  tokenize(query: string): string[] {
    const terms = (query.toLowerCase().match(/\p{L}+/gu) ?? [])
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    return [...new Set(terms)];
  }

  async retrieve(query: string, limit = 6): Promise<Passage[]> {
    const terms = this.tokenize(query);
    if (terms.length === 0) return [];

    // Koleksi yang boleh dijawab: PUBLISHED & bukan INTERNAL.
    const allowed = await this.documents.find({
      where: { status: 'PUBLISHED' },
      select: ['id', 'title', 'slug', 'accessType'],
    });
    const docMap = new Map(
      allowed.filter((d) => d.accessType !== 'INTERNAL').map((d) => [d.id, d]),
    );
    if (docMap.size === 0) return [];

    // Kandidat: potongan yang memuat salah satu istilah.
    const where = terms.map((_, i) => `LOWER(c.text) LIKE :t${i}`).join(' OR ');
    const params: Record<string, string> = {};
    terms.forEach((t, i) => (params[`t${i}`] = `%${t}%`));
    const candidates = await this.chunks
      .createQueryBuilder('c')
      .where(where, params)
      .take(CANDIDATE_CAP)
      .getMany();

    const scored: Passage[] = [];
    for (const c of candidates) {
      const doc = docMap.get(c.documentId);
      if (!doc) continue; // koleksi tak diizinkan (mis. INTERNAL)
      const lower = c.text.toLowerCase();
      let matched = 0;
      let freq = 0;
      for (const term of terms) {
        const n = countOccurrences(lower, term);
        if (n > 0) matched++;
        freq += n;
      }
      if (matched === 0) continue;
      // Cakupan istilah unik dominan; frekuensi sebagai pemecah seri.
      const score = matched * 100 + Math.min(freq, 20);
      scored.push({
        documentId: c.documentId,
        title: doc.title,
        slug: doc.slug,
        pageNo: c.pageNo,
        snippet: makeSnippet(c.text, terms),
        score,
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = haystack.indexOf(needle);
  while (pos !== -1) {
    count++;
    pos = haystack.indexOf(needle, pos + needle.length);
  }
  return count;
}

/** Cuplikan ±240 karakter di sekitar istilah pertama yang cocok. */
function makeSnippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    const p = lower.indexOf(term);
    if (p !== -1 && (idx === -1 || p < idx)) idx = p;
  }
  if (idx === -1) idx = 0;
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + 240);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}
