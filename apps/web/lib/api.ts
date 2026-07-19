export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ===== Tipe data (subset dari entity API) =====

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface RelatedLink {
  kind: 'video' | 'podcast' | 'news' | 'slides' | 'dataset' | 'event' | 'other';
  title: string;
  url: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  authors: string[];
  publisher: string | null;
  year: number | null;
  collectionType: string;
  language: string;
  abstract: string | null;
  abstractEn: string | null;
  subjects: string[];
  doi: string | null;
  relatedLinks: RelatedLink[];
  category: Category | null;
  accessType: 'OPEN' | 'MEMBER' | 'LOAN';
  status?: string;
  loanDurations: number[];
  previewPages: number;
  physicalCopies: number;
  pageCount: number | null;
  callNumber: string | null;
  hasDigitalCopy?: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  data: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

export interface Loan {
  id: string;
  status: 'ACTIVE' | 'RETURNED' | 'EXPIRED';
  durationDays: number;
  borrowedAt: string;
  expiresAt: string;
  document: DocumentItem;
}

export interface ReaderSession {
  sessionId: string;
  documentId: string;
  title: string;
  pageCount: number | null;
  lastPage: number;
}

export interface Hold {
  id: string;
  status: 'WAITING' | 'OFFERED' | 'CLAIMED' | 'CANCELLED' | 'EXPIRED';
  queuedAt: string;
  offerExpiresAt: string | null;
  document: DocumentItem;
}

export interface IsbnLookup {
  isbn: string;
  found: boolean;
  source: string;
  metadata: {
    title: string;
    authors: string[];
    publisher: string | null;
    year: number | null;
    coverUrl: string | null;
  } | null;
}

export interface PhysicalItem {
  id: string;
  accessionNo: string;
  barcode: string | null;
  shelfLocation: string | null;
  condition: string;
  acquisitionSource: string | null;
  document: DocumentItem;
}

export interface Stocktake {
  id: string;
  name: string;
  status: 'OPEN' | 'CLOSED';
  startedAt: string;
  closedAt: string | null;
  summary: {
    totalItems: number;
    found: number;
    missing: number;
    misplaced: number;
    unknownScans: number;
  } | null;
}

export interface StocktakeDetail {
  stocktake: Stocktake;
  scanCount: number;
  recentScans: {
    id: string;
    barcode: string;
    physicalItemId: string | null;
    scannedLocation: string | null;
  }[];
  live: {
    totalItems: number;
    found: number;
    remaining: number;
    unknownScans: number;
  };
}

export interface AuthorizationContext {
  client: { clientId: string; name: string; logoUri?: string };
  scopes: { key: string; label: string }[];
}

export interface Annotation {
  id: string;
  documentId: string;
  pageNo: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface RagCitation {
  n: number;
  title: string;
  slug: string;
  pageNo: number;
  snippet: string;
}

export interface RagAnswer {
  mode: 'ai' | 'extractive' | 'none';
  answer: string;
  citations: RagCitation[];
}

export interface Recommendation {
  title: string;
  slug: string;
  authors: string[];
  year: number | null;
  collectionType: string;
  category: string | null;
  basis: 'coread' | 'category' | 'recent';
  coReads: number;
}

export interface PublicImpact {
  generatedAt: string;
  totals: {
    publications: number;
    reads: number;
    members: number;
    categories: number;
    loans: number;
  };
  topPublic: {
    title: string;
    slug: string;
    category: string | null;
    reads: number;
  }[];
}

export interface AnalyticsDashboard {
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

export interface ImportBatch {
  id: string;
  filename: string;
  status: 'VALIDATING' | 'READY' | 'PROCESSING' | 'DONE' | 'FAILED';
  totals: {
    total: number;
    valid: number;
    warning: number;
    error: number;
    created: number;
    skipped: number;
    failedItems: number;
  } | null;
  autoPublish: boolean;
  createdAt: string;
}

export interface ImportItem {
  id: string;
  rowNo: number;
  status:
    | 'VALID'
    | 'WARNING'
    | 'ERROR'
    | 'PROCESSING'
    | 'CREATED'
    | 'SKIPPED'
    | 'FAILED';
  messages: string[];
  documentId: string | null;
  payload: {
    namaFile: string;
    judul: string;
    tipeAkses: string;
    kategori: string;
  };
}

export interface Availability {
  licenseCount: number;
  activeLoans: number;
  available: boolean;
  queueLength: number;
  loanDurations: number[];
  myLoan: { id: string; expiresAt: string } | null;
  myHold: {
    id: string;
    status: Hold['status'];
    position: number | null;
    offerExpiresAt: string | null;
  } | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'librarian' | 'superadmin';
  status: string;
  institution: string | null;
  phone: string | null;
  interests: string[];
  newsletterConsent: boolean;
  isInternal: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'librarian' | 'superadmin';
  status: string;
  institution: string | null;
  isInternal: boolean;
  createdAt: string;
}

// ===== Penyimpanan token =====

export function getTokens() {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  return accessToken ? { accessToken, refreshToken } : null;
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// ===== Klien HTTP =====

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const tokens = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...options.headers,
    },
  });

  // Access token kedaluwarsa → coba refresh sekali, lalu ulangi request.
  if (res.status === 401 && retry && tokens?.refreshToken) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (refreshed.ok) {
      const pair = await refreshed.json();
      saveTokens(pair.accessToken, pair.refreshToken);
      return request<T>(path, options, false);
    }
    clearTokens();
  }

  if (!res.ok) {
    let message = `Terjadi kesalahan (${res.status})`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      /* respons bukan JSON */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Ambil resource biner (halaman reader) dengan header Authorization. */
export async function apiBlob(path: string): Promise<Blob> {
  const tokens = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  if (!res.ok) {
    let message = `Gagal memuat (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* bukan JSON */
    }
    throw new ApiError(res.status, message);
  }
  return res.blob();
}

/** Unduh berkas terproteksi (butuh Authorization) lalu picu unduhan browser. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const tokens = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Gagal mengunduh (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Upload multipart (mis. ZIP impor). */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const tokens = getTokens();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  });
  if (!res.ok) {
    let message = `Gagal mengunggah (${res.status})`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      /* bukan JSON */
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
