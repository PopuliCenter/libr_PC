import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../catalog/entities/document.entity';
import { Hold } from '../holds/entities/hold.entity';
import { Loan } from '../loans/entities/loan.entity';
import { ReadingSession } from '../reader/entities/reading-session.entity';
import { User } from '../users/entities/user.entity';

export interface Dashboard {
  window: { days: number; since: string | null; generatedAt: string };
  overview: {
    reads: number;
    uniqueReaders: number;
    loans: number;
    activeLoans: number;
    publishedDocuments: number;
    totalMembers: number;
    newMembers: number;
    waitlist: number;
  };
  topDocuments: {
    documentId: string;
    title: string;
    slug: string | null;
    category: string | null;
    reads: number;
    loans: number;
  }[];
  byInstitution: { label: string; reads: number }[];
  byCategory: { label: string; reads: number }[];
  trend: { bucket: string; reads: number }[];
}

const NO_INSTITUTION = 'Tidak disebutkan';
const NO_CATEGORY = 'Tanpa kategori';
const SESSION_CAP = 20000; // batas ambil untuk agregasi (skala Fase 1)

/**
 * Analitik diseminasi (PRD I7) — lapisan dasbor di atas data Fase 1
 * (reading_sessions, loans, holds, users, documents). Tak ada tabel baru.
 *
 * Agregasi dihitung di aplikasi (bukan SQL GROUP BY) agar portabel
 * SQLite/PostgreSQL dan menghindari perbedaan format datetime antar-driver.
 * Cocok untuk skala Fase 1; bila data membesar, pindah ke SQL/materialized view.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ReadingSession)
    private readonly sessions: Repository<ReadingSession>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(Hold) private readonly holds: Repository<Hold>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async dashboard(days: number): Promise<Dashboard> {
    const since = days > 0 ? new Date(Date.now() - days * 86_400_000) : null;
    const inWindow = (d: Date | null | undefined): boolean =>
      !since || (!!d && new Date(d).getTime() >= since.getTime());

    const [sessions, loans, docs, users, waitlist, publishedDocuments, activeLoans] =
      await Promise.all([
        this.sessions.find({ order: { createdAt: 'DESC' }, take: SESSION_CAP }),
        this.loans.find({ order: { borrowedAt: 'DESC' }, take: SESSION_CAP }),
        this.documents.find(),
        this.users.find(),
        this.holds.count({ where: { status: 'WAITING' } }),
        this.documents.count({ where: { status: 'PUBLISHED' } }),
        this.loans.count({ where: { status: 'ACTIVE' } }),
      ]);

    const docById = new Map(docs.map((d) => [d.id, d]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const winSessions = sessions.filter((s) => inWindow(s.createdAt));
    const winLoans = loans.filter((l) => inWindow(l.borrowedAt));

    // Publikasi paling dibaca (+ peminjaman) dalam rentang.
    const readsByDoc = tally(winSessions.map((s) => s.documentId));
    const loansByDoc = tally(winLoans.map((l) => l.document?.id).filter(Boolean) as string[]);
    const topDocuments = [...readsByDoc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([documentId, reads]) => {
        const d = docById.get(documentId);
        return {
          documentId,
          title: d?.title ?? '(koleksi terhapus)',
          slug: d?.slug ?? null,
          category: d?.category?.name ?? null,
          reads,
          loans: loansByDoc.get(documentId) ?? 0,
        };
      });

    // Per institusi (segmen).
    const byInstitution = topEntries(
      tally(
        winSessions.map(
          (s) => userById.get(s.userId)?.institution?.trim() || NO_INSTITUTION,
        ),
      ),
      8,
    );

    // Per topik (kategori koleksi yang dibaca).
    const byCategory = topEntries(
      tally(
        winSessions.map(
          (s) => docById.get(s.documentId)?.category?.name ?? NO_CATEGORY,
        ),
      ),
      8,
    );

    return {
      window: {
        days,
        since: since?.toISOString() ?? null,
        generatedAt: new Date().toISOString(),
      },
      overview: {
        reads: winSessions.length,
        uniqueReaders: new Set(winSessions.map((s) => s.userId)).size,
        loans: winLoans.length,
        activeLoans,
        publishedDocuments,
        totalMembers: users.filter((u) => u.status === 'active').length,
        newMembers: users.filter((u) => inWindow(u.createdAt)).length,
        waitlist,
      },
      topDocuments,
      byInstitution,
      byCategory,
      trend: this.trend(winSessions, days),
    };
  }

  /** Tren pembacaan: harian bila rentang ≤ 45 hari, selain itu bulanan. */
  private trend(sessions: ReadingSession[], days: number): Dashboard['trend'] {
    const daily = days > 0 && days <= 45;
    const key = (d: Date): string => {
      const iso = new Date(d).toISOString();
      return daily ? iso.slice(0, 10) : iso.slice(0, 7);
    };
    const counts = tally(sessions.map((s) => key(s.createdAt)));

    if (daily) {
      // Isi hari kosong dengan 0 agar grafik kontinu.
      const out: Dashboard['trend'] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        out.push({ bucket: d, reads: counts.get(d) ?? 0 });
      }
      return out;
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([bucket, reads]) => ({ bucket, reads }));
  }
}

function tally(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

function topEntries(m: Map<string, number>, limit: number): { label: string; reads: number }[] {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, reads]) => ({ label, reads }));
}
