/**
 * Pembuat sitasi (APA 7, Chicago, BibTeX) dan meta tag Google Scholar
 * (citation_*) dari metadata koleksi. Fungsi murni — mudah diuji, tanpa efek.
 *
 * Catatan nama penulis: data hanya menyimpan nama tampilan (bisa nama tunggal,
 * nama lembaga, atau nama lengkap tanpa struktur marga/depan). Karena konvensi
 * nama Indonesia tak selalu punya marga, nama ditampilkan apa adanya dan tidak
 * dibalik menjadi "Marga, Inisial" agar tidak salah.
 */
export interface CitableDoc {
  title: string;
  authors: string[];
  year: number | null;
  publisher: string | null;
  collectionType: string;
  language?: string;
  subjects?: string[];
}

const orDash = (s: string | null | undefined) => (s && s.trim() ? s.trim() : '');

/** Gabungan penulis gaya APA: "A", "A & B", "A, B, & C". */
function authorsApa(authors: string[]): string {
  const a = authors.filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} & ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, & ${a[a.length - 1]}`;
}

/** Buang titik ganda dan spasi berlebih di akhir rangkaian. */
function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').replace(/\s+\./g, '.').trim();
}

export function formatApa(doc: CitableDoc): string {
  const authors = authorsApa(doc.authors);
  const year = doc.year ? `(${doc.year})` : '(n.d.)';
  const title = doc.title.endsWith('.') ? doc.title : `${doc.title}.`;
  const publisher = orDash(doc.publisher);
  const lead = authors ? `${authors} ${year}.` : `${title.replace(/\.$/, '')} ${year}.`;
  const body = authors ? `${title} ${publisher ? publisher + '.' : ''}` : `${publisher ? publisher + '.' : ''}`;
  return tidy(`${lead} ${body}`);
}

export function formatChicago(doc: CitableDoc): string {
  const authors = doc.authors.filter(Boolean).join(', ');
  const title = doc.title.replace(/\.$/, '');
  const publisher = orDash(doc.publisher);
  const tail = [publisher, doc.year ? String(doc.year) : ''].filter(Boolean).join(', ');
  const lead = authors ? `${authors}. ` : '';
  return tidy(`${lead}${title}. ${tail}.`);
}

const BIBTEX_TYPE: Record<string, string> = {
  jurnal: 'article',
  buku: 'book',
  prosiding: 'inproceedings',
  laporan: 'techreport',
  dataset: 'misc',
  lainnya: 'misc',
};

/** Kunci sitasi: kata pertama penulis (alfanumerik) + tahun, mis. "populi2024". */
function bibKey(doc: CitableDoc): string {
  const base = (doc.authors[0] ?? doc.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16) || 'ref';
  return `${base}${doc.year ?? 'nd'}`;
}

export function formatBibtex(doc: CitableDoc): string {
  const type = BIBTEX_TYPE[doc.collectionType] ?? 'misc';
  const publisherField = type === 'techreport' ? 'institution' : 'publisher';
  const fields: [string, string][] = [
    ['author', doc.authors.filter(Boolean).join(' and ')],
    ['title', doc.title],
    ['year', doc.year ? String(doc.year) : ''],
    [publisherField, orDash(doc.publisher)],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k.padEnd(11)}= {${v}}`)
    .join(',\n');
  return `@${type}{${bibKey(doc)},\n${body}\n}`;
}

export interface Citation {
  key: 'apa' | 'chicago' | 'bibtex';
  label: string;
  text: string;
}

export function buildCitations(doc: CitableDoc): Citation[] {
  return [
    { key: 'apa', label: 'APA', text: formatApa(doc) },
    { key: 'chicago', label: 'Chicago', text: formatChicago(doc) },
    { key: 'bibtex', label: 'BibTeX', text: formatBibtex(doc) },
  ];
}

/**
 * Meta tag Google Scholar (citation_*). Dikembalikan sebagai objek untuk
 * `metadata.other` Next.js; nilai array menghasilkan beberapa tag bernama sama
 * (mis. satu citation_author per penulis).
 */
export function citationMeta(doc: CitableDoc): Record<string, string | string[]> {
  const meta: Record<string, string | string[]> = {
    citation_title: doc.title,
  };
  const authors = doc.authors.filter(Boolean);
  if (authors.length) meta.citation_author = authors;
  if (doc.year) meta.citation_publication_date = String(doc.year);
  if (orDash(doc.publisher)) meta.citation_publisher = doc.publisher as string;
  if (doc.language) meta.citation_language = doc.language;
  if (doc.subjects?.length) meta.citation_keywords = doc.subjects.join('; ');
  return meta;
}
