import { DocumentItem } from './api';

export type Lang = 'id' | 'en';

/**
 * Kamus i18n untuk permukaan publik (jelajah → detail) — audiens
 * internasional/funder (PRD P4). Alat internal (admin/reader) tetap ID.
 */
export const DICT: Record<string, Record<Lang, string>> = {
  // Header
  catalog: { id: 'Katalog', en: 'Catalog' },
  impact: { id: 'Dampak', en: 'Impact' },
  signin: { id: 'Masuk', en: 'Sign in' },
  register: { id: 'Daftar', en: 'Register' },
  logout: { id: 'Keluar', en: 'Sign out' },
  admin: { id: 'Admin', en: 'Admin' },
  // Home
  homeTitle: { id: 'Katalog Koleksi', en: 'Collection Catalog' },
  homeSub: {
    id: 'Telusuri publikasi, laporan riset, dan koleksi digital Populi Center.',
    en: 'Browse Populi Center publications, research reports, and digital collections.',
  },
  searchPlaceholder: {
    id: 'Cari judul, penulis, atau topik…',
    en: 'Search title, author, or topic…',
  },
  allTypes: { id: 'Semua tipe', en: 'All types' },
  searchBtn: { id: 'Cari', en: 'Search' },
  found: { id: 'koleksi ditemukan', en: 'collections found' },
  loading: { id: 'Memuat…', en: 'Loading…' },
  prev: { id: '‹ Sebelumnya', en: '‹ Previous' },
  next: { id: 'Berikutnya ›', en: 'Next ›' },
  pageLabel: { id: 'Hal.', en: 'Page' },
  // Access labels
  OPEN: { id: 'Terbuka', en: 'Open' },
  MEMBER: { id: 'Anggota', en: 'Member' },
  LOAN: { id: 'Sewa', en: 'Loan' },
  INTERNAL: { id: 'Internal', en: 'Internal' },
  // Detail sections & meta
  abstract: { id: 'Abstrak', en: 'Abstract' },
  details: { id: 'Detail Koleksi', en: 'Collection Details' },
  recommendations: { id: 'Rekomendasi Bacaan', en: 'Recommended Reading' },
  relatedMedia: { id: 'Acara & Multimedia Terkait', en: 'Related Events & Media' },
  author: { id: 'Penulis', en: 'Author' },
  publisher: { id: 'Penerbit', en: 'Publisher' },
  year: { id: 'Tahun', en: 'Year' },
  type: { id: 'Tipe koleksi', en: 'Collection type' },
  language: { id: 'Bahasa', en: 'Language' },
  category: { id: 'Kategori', en: 'Category' },
  subject: { id: 'Subjek', en: 'Subject' },
  pages: { id: 'Jumlah halaman', en: 'Page count' },
  callNumber: { id: 'No. panggil', en: 'Call number' },
  physicalCopies: { id: 'Eksemplar fisik', en: 'Physical copies' },
  digitalOnly: { id: 'Hanya digital', en: 'Digital only' },
  physicalAt: { id: 'eksemplar di perpustakaan', en: 'copies at the library' },
  cite: { id: '❝ Kutip', en: '❝ Cite' },
  readOnline: { id: '📖 Baca Online', en: '📖 Read Online' },
  signinToRead: { id: 'Masuk untuk membaca', en: 'Sign in to read' },
  // Access info sentences
  accessInfo_OPEN: {
    id: 'Koleksi terbuka — dapat dibaca semua anggota setelah masuk.',
    en: 'Open collection — readable by all members after signing in.',
  },
  accessInfo_MEMBER: {
    id: 'Koleksi ini dapat dibaca setelah masuk sebagai anggota.',
    en: 'This collection is readable after signing in as a member.',
  },
  accessInfo_LOAN: {
    id: 'Koleksi ini perlu dipinjam terlebih dahulu (akses berbatas waktu).',
    en: 'This collection must be borrowed first (time-limited access).',
  },
  accessInfo_INTERNAL: {
    id: 'Koleksi internal — akses terbatas untuk peneliti internal Populi.',
    en: 'Internal collection — restricted to Populi internal researchers.',
  },
  multimediaNote: {
    id: 'Koleksi multimedia — tonton/dengarkan pada pemutar di bawah.',
    en: 'Multimedia collection — watch/listen on the player below.',
  },
  digitalUnavailable: {
    id: ' Versi digital koleksi ini belum tersedia — hubungi pustakawan.',
    en: ' A digital version is not yet available — please contact the librarian.',
  },
  basis_coread: { id: 'Dibaca bersama', en: 'Read together' },
  basis_category: { id: 'Topik serupa', en: 'Similar topic' },
  basis_recent: { id: 'Terbitan terbaru', en: 'Recently published' },
};

export function t(lang: Lang, key: string): string {
  return DICT[key]?.[lang] ?? key;
}

/** Judul terlokalisasi: EN bila dipilih & tersedia, selain itu judul asli. */
export function docTitle(doc: Pick<DocumentItem, 'title' | 'titleEn'>, lang: Lang): string {
  return lang === 'en' && doc.titleEn ? doc.titleEn : doc.title;
}

export function docAbstract(
  doc: Pick<DocumentItem, 'abstract' | 'abstractEn'>,
  lang: Lang,
): string | null {
  return lang === 'en' && doc.abstractEn ? doc.abstractEn : doc.abstract;
}
