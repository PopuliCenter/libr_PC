/**
 * Kontrak event domain (SDD 2.6) — dipancarkan modul loans/holds,
 * didengarkan NotificationsListener (email) dan HoldsService (antrian).
 */

export const LOAN_CREATED = 'loan.created';
export const LOAN_EXPIRING = 'loan.expiring';
export const LOAN_RELEASED = 'loan.released';
export const HOLD_OFFERED = 'hold.offered';
export const DOCUMENT_PUBLISHED = 'document.published';
export const DOCUMENT_DIGITIZED = 'document.digitized';

export class LoanCreatedEvent {
  constructor(
    readonly userId: string,
    readonly documentTitle: string,
    readonly expiresAt: Date,
  ) {}
}

export class LoanExpiringEvent {
  constructor(
    readonly userId: string,
    readonly documentTitle: string,
    readonly expiresAt: Date,
  ) {}
}

/** Lisensi kembali ke pool (dikembalikan / kedaluwarsa) → picu tawaran antrian. */
export class LoanReleasedEvent {
  constructor(
    readonly documentId: string,
    readonly userId: string,
    readonly documentTitle: string,
    readonly reason: 'returned' | 'expired',
  ) {}
}

export class HoldOfferedEvent {
  constructor(
    readonly userId: string,
    readonly documentTitle: string,
    readonly documentSlug: string,
    readonly offerExpiresAt: Date,
  ) {}
}

/** Koleksi baru terbit → notifikasi ke anggota yang minatnya cocok (PRD I6). */
export class DocumentPublishedEvent {
  constructor(
    readonly documentId: string,
    readonly title: string,
    readonly slug: string,
    /** Topik koleksi (slug kategori + subjek) untuk pencocokan minat. */
    readonly topics: string[],
  ) {}
}
