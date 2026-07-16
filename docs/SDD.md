# SDD — Sistem Perpustakaan Digital Populi Center

| | |
|---|---|
| **Dokumen** | Software Design Document (SDD) |
| **Versi** | 1.0 (Draft) |
| **Tanggal** | 8 Juli 2026 |
| **Acuan** | PRD v1.0 (docs/PRD.md) |

---

## 1. Ringkasan Arsitektur

Arsitektur **modular monolith + worker** — cukup sederhana untuk tim kecil, tetapi memisahkan beban berat (render PDF, OCR, impor massal) ke background worker agar aplikasi utama tetap responsif.

```
                        ┌──────────────────────────────────────────┐
                        │                 PENGGUNA                 │
                        │  (browser desktop / mobile)              │
                        └───────────────┬──────────────────────────┘
                                        │ HTTPS
                        ┌───────────────▼──────────────┐
                        │        CDN / Reverse Proxy    │  Nginx / Cloudflare
                        │  (cache halaman ter-render)   │
                        └───────┬───────────────┬──────┘
                                │               │
              ┌─────────────────▼───┐   ┌───────▼────────────────┐
              │   Frontend Web       │   │   Backend API          │
              │   Next.js (SSR)      │──▶│   NestJS / Laravel     │
              │   - Katalog (SEO)    │   │   - Auth & member      │
              │   - Protected Reader │   │   - Katalog & sewa     │
              │   - Panel Admin      │   │   - Reader API         │
              └──────────────────────┘   │   - Impor massal API   │
                                         └──┬──────┬──────┬──────┘
                                            │      │      │
                     ┌──────────────────────▼┐  ┌──▼───┐ ┌▼─────────────────┐
                     │  PostgreSQL            │  │Redis │ │ Object Storage   │
                     │  metadata, user, loan  │  │queue │ │ S3/MinIO:        │
                     │  audit log             │  │cache │ │ - PDF master 🔒  │
                     └────────────────────────┘  └──┬───┘ │ - page render    │
                                                    │     │ - cover/thumb    │
                              ┌─────────────────────▼──┐  └──────────────────┘
                              │  Background Workers     │
                              │  (BullMQ / Laravel Queue)│
                              │  - PDF → render per hal. │
                              │  - OCR (Tesseract)       │
                              │  - Impor batch metadata  │
                              │  - Email & scheduler sewa│
                              └──────────────────────────┘
```

### Pilihan Teknologi (rekomendasi)

| Lapisan | Pilihan Utama | Alternatif | Alasan |
|---|---|---|---|
| Frontend | **Next.js 14+ (React, TypeScript)** | Nuxt/Vue | SSR untuk SEO katalog, ekosistem reader matang |
| Backend API | **NestJS (Node/TS)** | Laravel 11 (PHP) | Satu bahasa dengan frontend; Laravel jika tim lebih familiar PHP |
| Database | **PostgreSQL 16** | MySQL 8 | Full-text search bawaan (tsvector) cukup untuk fase 1 |
| Cache & Queue | **Redis + BullMQ** | Laravel Horizon | Antrian job render/OCR/impor |
| Object Storage | **MinIO** (self-host) | AWS S3 / Cloudflare R2 | Signed URL, private bucket untuk PDF master |
| Render PDF | **pdftoppm/MuPDF via worker** | pdf.js server-side | Render server-side = file asli tidak pernah ke browser |
| OCR | **Tesseract 5 (ind+eng)** | Google Vision API | Gratis; Vision API jika akurasi kurang |
| Email | **SMTP (mis. Mailersend/SES)** | — | Verifikasi, notifikasi sewa |
| Deploy | **Docker Compose di VPS** | Kubernetes (nanti) | Sederhana, murah, cukup untuk skala fase 1 |

> Alternatif "beli jadi": **SLiMS/Inlislite** (SLiMS populer di Indonesia) menangani katalog tetapi **tidak punya** protected reader + sewa digital + impor pipeline seperti dispesifikasikan; kustomisasinya lebih mahal daripada membangun sistem ini. Keputusan di dokumen ini: **build**.

---

## 2. Desain Modul

### 2.1 Modul Auth & Keanggotaan
- Registrasi → simpan user status `PENDING` → kirim email verifikasi (token JWT sekali pakai, exp 24 jam) → klik → `ACTIVE`.
- Login: email+password (argon2id), sesi via **JWT access token (15 menit) + refresh token (httpOnly cookie, 30 hari, rotasi)**.
- RBAC: `member`, `librarian`, `superadmin`.
- Rate limit login: 5 percobaan/menit/IP; lockout progresif.
- Pembatasan sesi bersamaan: tabel `sessions` — saat sesi baca aktif melebihi batas (default 2), sesi tertua dicabut.

### 2.2 Modul Katalog
- Metadata mengikuti subset **Dublin Core / MARC-lite** agar kompatibel jika kelak integrasi OAI-PMH.
- Full-text search: kolom `search_vector tsvector` (judul, penulis, subjek, abstrak, hasil OCR) + GIN index. Upgrade path: Meilisearch/Typesense bila butuh typo-tolerance.
- Status koleksi: `DRAFT → PUBLISHED → ARCHIVED`.
- Tipe akses: `OPEN` (publik), `MEMBER` (login), `LOAN` (harus pinjam).

### 2.3 Modul Protected Reader — desain proteksi

**Prinsip: file PDF asli tidak pernah meninggalkan server.**

Pipeline saat dokumen di-upload/diimpor (di worker):
1. PDF master disimpan di bucket **private** (`masters/`), terenkripsi at-rest (SSE), tidak ada URL publik.
2. Worker me-render tiap halaman → **WebP/JPEG per halaman** dalam 2 resolusi (thumbnail + baca ~150 dpi) → disimpan di bucket `pages/{docId}/{page}.webp` (juga private).
3. Jumlah halaman, thumbnail sampul, dan hasil OCR disimpan ke DB.

Saat anggota membaca:
```
Reader (browser)                Backend                        Storage
   │  buka dokumen                 │                              │
   ├──POST /reader/session────────▶│ cek hak akses:               │
   │                               │  OPEN? MEMBER? LOAN aktif?   │
   │◀─reading_session (JWT 5 mnt)──┤ + watermark payload          │
   │                               │                              │
   ├──GET /reader/{s}/page/12─────▶│ validasi session, log akses  │
   │                               ├─ambil pages/…/12.webp───────▶│
   │                               │ + stamp watermark dinamis    │
   │◀─image (no-store, no-cache)───┤   (nama+email+waktu, overlay)│
```

Kontrol sisi klien (deterrent, bukan jaminan):
- Canvas rendering (bukan `<img>` langsung), `user-select: none`, blokir context-menu, blokir `Ctrl+P/Ctrl+S/Ctrl+C`, CSS `@media print { visibility: hidden }`.
- Halaman diambil bertahap (viewport ± 2 halaman) — tidak ada endpoint "semua halaman".
- `Cache-Control: no-store` pada respons halaman; token sesi baca exp 5 menit, di-refresh otomatis selama tab aktif.
- Watermark **server-side** tertanam di piksel gambar (bukan overlay DOM yang bisa dihapus via DevTools).
- Deteksi anomali: >N halaman/menit atau akses berurutan cepat penuh 1 dokumen → sesi ditangguhkan + alert admin (indikasi scraping).

Keterbatasan yang didokumentasikan: screenshot OS/foto layar tidak bisa dicegah teknologi web mana pun; mitigasinya watermark identitas (jejak forensik) + audit log.

### 2.4 Modul Sewa / Peminjaman Digital

Model **lisensi berjumlah terbatas** (mengikuti pola iPusnas/Libby):

- `documents.license_count` = jumlah kopi digital.
- Pinjam: transaksi DB dengan lock — `SELECT ... FOR UPDATE` pada agregat pinjaman aktif; jika `active_loans < license_count` → buat `loan` status `ACTIVE`, `expires_at = now() + durasi`.
- **Penegakan kedaluwarsa dua lapis:**
  1. *Lazy check*: setiap request halaman reader memvalidasi `loan.expires_at > now()` — akses mati seketika saat lewat tempo, tanpa menunggu job.
  2. *Scheduler* (tiap menit): tandai loan lewat tempo → `EXPIRED`, cabut reading session di Redis, kirim email, tawarkan ke antrian.
- Antrian: tabel `holds` FIFO; saat lisensi bebas → hold teratas mendapat status `OFFERED` dengan jendela klaim 24 jam → tidak diklaim → lanjut ke berikutnya.
- Pengembalian awal: `RETURNED`, lisensi langsung ke pool/antrian.
- Hook pembayaran (Fase 2): tabel `loan_payments` + status `PENDING_PAYMENT` sebelum `ACTIVE`; adapter Midtrans/Xendit.

### 2.5 Modul Impor Massal (Bulk Ingestion)

**Template metadata** (`.xlsx`, sheet `Koleksi` + sheet `Petunjuk` berisi keterangan kolom & contoh):

| Kolom | Wajib | Contoh |
|---|---|---|
| `nama_file` | ✔ | `2023_survei_nasional_01.pdf` |
| `judul` | ✔ | Survei Nasional Persepsi Publik 2023 |
| `penulis` | ✔ | Tim Riset Populi Center (pisah `;` jika >1) |
| `tahun` | ✔ | 2023 |
| `tipe_koleksi` | ✔ | buku / laporan / jurnal / prosiding |
| `kategori` | ✔ | Politik > Survei Opini (hierarki dengan `>`) |
| `tipe_akses` | ✔ | OPEN / MEMBER / LOAN |
| `jumlah_lisensi` | jika LOAN | 3 |
| `durasi_sewa_hari` | jika LOAN | 1,3,7 |
| `penerbit`, `isbn_issn`, `bahasa`, `subjek`, `abstrak`, `no_panggil`, `halaman_preview` | ─ | … |

**Alur pemrosesan:**
1. Admin upload template + file PDF (multi-upload atau 1 ZIP; upload resumable via tus/chunked untuk file besar).
2. **Parse & validasi (sinkron, cepat):** baca xlsx (SheetJS/PhpSpreadsheet) → cocokkan `nama_file` ↔ isi ZIP → hasil validasi per baris: `VALID / WARNING / ERROR` (file hilang, kolom wajib kosong, duplikat ISBN/judul-tahun, tipe akses tak dikenal).
3. Admin melihat pratinjau → pilih **"Impor baris valid"** (baris error diunduh sebagai `errors.xlsx` untuk diperbaiki & diunggah ulang).
4. **Job batch (asinkron)** per dokumen: simpan master → render halaman → thumbnail → OCR → update `search_vector` → status dokumen `DRAFT` (atau `PUBLISHED` jika opsi auto-publish dicentang).
5. Progres batch real-time (polling/SSE): `menunggu / diproses / selesai / gagal` per item; item gagal bisa di-retry individual.
6. Laporan akhir batch dapat diunduh (xlsx).

Idempotensi: `import_items.checksum` (SHA-256 file) — file identik yang diimpor ulang terdeteksi duplikat.

### 2.6 Modul Inventarisasi Fisik via Scan HP (PWA)

**Prinsip: tanpa aplikasi native** — halaman admin di-build sebagai PWA; pustakawan membuka URL di browser HP, memberi izin kamera, dan langsung memindai.

- **Pemindaian barcode:** `BarcodeDetector` API (Chrome/Edge Android, native & cepat) dengan fallback **ZXing-js** untuk Safari iOS. Format yang didukung: EAN-13 (ISBN), Code-128 & QR (label internal).
- **Lookup metadata ISBN:** urutan sumber — (1) cek DB lokal (duplikat → tampilkan record lama, tawarkan "tambah eksemplar"), (2) **Google Books API**, (3) **Open Library API** sebagai fallback. Hasil di-cache di tabel `isbn_cache` agar scan ulang tidak memanggil API eksternal. Jika keduanya kosong → form isian manual dengan ISBN sudah terisi.
- **Label internal:** generator nomor induk berformat `PC-{tahun}-{seq}` → render QR/Code-128 ke lembar stiker A4 (PDF, grid 5×13 label) untuk koleksi tanpa ISBN.
- **Stock opname:** sesi opname (`stocktakes`) menyimpan snapshot daftar eksemplar aktif; tiap scan menandai eksemplar `FOUND` + lokasi rak aktual; penutupan sesi menghitung `MISSING` (tidak ter-scan) dan `MISPLACED` (lokasi scan ≠ lokasi tercatat); laporan xlsx.
- **Offline-tolerant:** service worker + antrian scan di IndexedDB; sinkron batch saat online (endpoint `POST /admin/scans/sync` idempoten via `client_scan_id` UUID dari perangkat).
- **Scanner fisik USB/BT** otomatis kompatibel (emulasi keyboard — input field yang sama menerima ketikan scanner).
- **Tautan fisik↔digital:** `physical_items.document_id` menunjuk ke record `documents` yang sama dengan file PDF — satu judul bisa punya eksemplar fisik dan wujud digital sekaligus.

### 2.7 Modul Antrian Digitalisasi & Scan-to-PDF

- **Deteksi otomatis, bukan data ganda:** antrian digitalisasi adalah *view* — `documents` yang punya `physical_items` tetapi `master_object_key IS NULL`. Tidak ada tabel daftar terpisah yang harus dirawat; begitu PDF ter-upload, judul otomatis keluar dari antrian.
- **Status pengerjaan:** kolom `documents.digitization_status` (`NONE | QUEUED | IN_PROGRESS | DONE`) + `digitization_assignee` agar tidak ada scan ganda oleh dua staf.
- **Prioritas:** skor = jumlah `digitization_requests` (pengajuan anggota) + bobot popularitas (frekuensi dilihat di katalog). Diurutkan default di halaman antrian.
- **Upload dari HP:** endpoint upload yang sama dengan impor massal, resumable/chunked (tus) — penting karena upload PDF 50–100 MB lewat jaringan seluler rawan putus. Setelah selesai, masuk queue worker pipeline standar: validasi PDF → simpan master → render halaman → thumbnail → OCR → `digitization_status = DONE`.
- **Gerbang hak cipta:** `documents.copyright_status` (`OWNED | LICENSED | UNCLEARED`); guard pada transisi `DRAFT → PUBLISHED` menolak publikasi bila `UNCLEARED` (file tetap tersimpan sebagai arsip internal, hanya metadata/preview yang tampil publik).
- **(Fase 2) Capture in-app:** PWA memotret per halaman → JPEG diantrikan di IndexedDB → chunked upload → worker merakit (img2pdf) + deskew (OpenCV) + OCR. Ditunda karena vFlat/Adobe Scan sudah menyelesaikan 90% kasus dengan kualitas lebih baik (dewarping lengkung halaman) tanpa biaya pengembangan.
- **Ekspor ke vendor:** antrian dapat diekspor xlsx dengan kolom yang sama dengan template impor F6 (`nama_file` pre-generated dari nomor induk) — hasil vendor tinggal masuk pipeline impor massal tanpa mapping ulang.

### 2.8 Modul Notifikasi
Event-driven via queue: `loan.created`, `loan.expiring(H-1)`, `loan.expired`, `hold.offered`, `user.registered`. Template email Bahasa Indonesia; retry 3× dengan backoff.

### 2.9 Modul SSO — OpenID Connect Provider (PRD I1)

Perpustakaan menjadi **penerbit identitas** bagi aplikasi survei & layanan Populi lain — satu akun untuk semua. Dipilih ketimbang IdP eksternal karena semua akun (termasuk konsolidasi Google login) sudah ada di sini dan arsitektur JWT Fase 1 kompatibel.

- **Alur:** OAuth 2.0 Authorization Code **+ PKCE wajib** (S256). Endpoint `authorization_endpoint` adalah **halaman consent di web** (SPA berbasis JWT localStorage, bukan cookie sesi server): halaman memastikan anggota login, memanggil `POST /oauth/authorize` dengan token anggota, backend menerbitkan `code` → redirect ke `redirect_uri` klien. Klien menukar `code` di `POST /oauth/token`, memverifikasi `id_token` via `/oauth/jwks`, dan/atau memanggil `/oauth/userinfo`.
- **Kunci & token:** `id_token`/`access_token`/`refresh_token` ditandatangani **RS256** (kunci RSA per-issuer, publik dipublikasikan sebagai **JWKS**) sehingga klien memverifikasi tanpa berbagi rahasia. Kunci dari `OIDC_PRIVATE_KEY` (persisten di produksi; dev membuat kunci sementara + peringatan).
- **Registri klien:** dari env `OAUTH_CLIENTS` (JSON), bukan admin-UI — tak ada permukaan tulis publik untuk mendaftarkan klien. Klien confidential (punya `client_secret`) diverifikasi di token endpoint; klien publik cukup PKCE.
- **Keamanan:** kode otorisasi **sekali-pakai** (disimpan sebagai hash) & **berumur 60 detik** (tabel `oauth_authorization_codes`, cron pembersih) → anti-replay; `redirect_uri` **cocok persis** → anti open-redirect; scope dibatasi per klien (`openid` wajib); klaim identitas ter-scope (`profile`→name, `email`→email+email_verified) — **`role` internal tak pernah diterbitkan** ke klien, mencegah eskalasi hak akses lewat SSO.
- **Interop:** `/.well-known/openid-configuration` + JWKS membuat pustaka OIDC standar (mis. di aplikasi survei) mengonsumsi tanpa kode khusus.

### 2.10 Sitasi & metadata akademik (PRD I9)

- **Formatter murni** (`web/lib/citations.ts`): APA 7, Chicago, BibTeX dari metadata koleksi — fungsi tanpa efek, mudah diuji. Tipe BibTeX menyesuaikan `collectionType` (`jurnal`→article, `buku`→book, `laporan`→techreport, dst.). Nama penulis **tidak dibalik** menjadi "Marga, Inisial" karena konvensi nama Indonesia tak selalu berstruktur begitu — ditampilkan apa adanya agar tak salah.
- **Komponen Kutip** (`CiteBox`): tab APA/Chicago/BibTeX + salin ke clipboard.
- **Meta Google Scholar:** halaman detail koleksi diubah menjadi **server component** dengan `generateMetadata` yang merender tag `citation_*` (`citation_title`, `citation_author` per penulis, `citation_publication_date`, `citation_publisher`, `citation_language`, `citation_keywords`) di HTML **sisi server** — syarat agar terindeks Google Scholar. Bagian interaktif (pinjam/antre/baca) tetap client component (`DocumentDetailClient`) yang menerima dokumen hasil fetch server sebagai prop (tanpa fetch ganda).

---

## 3. Desain Data (skema inti)

```sql
users(id, name, email UNIQUE, password_hash, phone, institution,
      role, status, email_verified_at, created_at)

sessions(id, user_id FK, refresh_token_hash, device_info, ip,
         last_seen_at, revoked_at)

categories(id, parent_id FK NULL, name, slug)

documents(id, title, authors[], publisher, year, isbn_issn,
          collection_type, language, abstract, call_number,
          category_id FK, access_type,             -- OPEN|MEMBER|LOAN
          license_count INT DEFAULT 1,
          loan_durations INT[],                    -- {1,3,7}
          preview_pages INT DEFAULT 0,
          page_count INT, status,                  -- DRAFT|PUBLISHED|ARCHIVED
          copyright_status,                        -- OWNED|LICENSED|UNCLEARED
          digitization_status,                     -- NONE|QUEUED|IN_PROGRESS|DONE
          digitization_assignee FK NULL,
          master_object_key, cover_object_key,
          checksum, search_vector tsvector, created_at)

digitization_requests(id, document_id FK, user_id FK, at,
                      UNIQUE(document_id, user_id))

document_pages(document_id FK, page_no, object_key, ocr_text,
               PRIMARY KEY(document_id, page_no))

loans(id, user_id FK, document_id FK,
      status,                                      -- ACTIVE|RETURNED|EXPIRED
      borrowed_at, expires_at, returned_at)
  -- partial index: UNIQUE(user_id, document_id) WHERE status='ACTIVE'

holds(id, user_id FK, document_id FK, queued_at,
      status, offered_at, offer_expires_at)        -- WAITING|OFFERED|CLAIMED|CANCELLED

reading_sessions(id, user_id FK, document_id FK, loan_id FK NULL,
                 issued_at, expires_at, revoked_at, ip, user_agent)

reading_events(id, session_id FK, page_no, at)     -- audit & analitik

physical_items(id, document_id FK, accession_no UNIQUE,   -- nomor induk, mis. PC-2026-00123
               barcode,                                    -- ISBN atau kode label internal
               shelf_location, condition,                  -- BAIK|RUSAK_RINGAN|RUSAK_BERAT|HILANG
               acquisition_source, acquired_at, created_at)

isbn_cache(isbn PRIMARY KEY, payload JSONB, source, fetched_at)

stocktakes(id, name, started_by FK, status,                -- OPEN|CLOSED
           started_at, closed_at, summary JSONB)
stocktake_scans(id, stocktake_id FK, physical_item_id FK,
                scanned_by FK, scanned_location, client_scan_id UUID UNIQUE, at)

import_batches(id, admin_id FK, filename, status, totals JSONB, created_at)
import_items(id, batch_id FK, row_no, payload JSONB, pdf_object_key,
             checksum, status, error_message, document_id FK NULL)

audit_logs(id, actor_id, action, entity, entity_id, meta JSONB, at)
```

---

## 4. Desain API (ringkas, REST `/api/v1`)

| Method & Path | Auth | Fungsi |
|---|---|---|
| `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/forgot-password` | publik | Alur akun |
| `GET /documents?query=&category=&year=&type=&page=` | publik | Pencarian katalog |
| `GET /documents/{slug}` | publik | Detail + status akses & ketersediaan lisensi |
| `POST /loans {document_id, duration_days}` | member | Pinjam (409 jika lisensi habis → tawarkan hold) |
| `POST /loans/{id}/return` | member | Kembali awal |
| `POST /holds {document_id}` / `POST /holds/{id}/claim` | member | Antrian |
| `GET /me/loans`, `GET /me/holds`, `GET /me/history` | member | Dasbor anggota |
| `POST /reader/sessions {document_id}` | sesuai akses | Buat sesi baca (validasi OPEN/MEMBER/LOAN) |
| `GET /reader/sessions/{id}/pages/{n}` | token sesi | Gambar halaman ber-watermark (`no-store`) |
| `POST /admin/documents`, `PATCH /admin/documents/{id}`, … | librarian | CRUD koleksi |
| `GET /admin/import/template` | librarian | Unduh template xlsx |
| `POST /admin/import/batches` (multipart/chunked) | librarian | Upload template+ZIP |
| `POST /admin/import/batches/{id}/validate` → `/commit` | librarian | Pratinjau → eksekusi |
| `GET /admin/import/batches/{id}` (SSE/poll) | librarian | Progres batch |
| `GET /catalog/isbn/{isbn}` | librarian | Lookup metadata ISBN (lokal → Google Books → Open Library) |
| `POST /admin/physical-items` | librarian | Registrasi eksemplar (dari hasil scan) |
| `POST /admin/labels/batches` | librarian | Generate PDF lembar label QR/barcode internal |
| `POST /admin/stocktakes` / `POST /admin/stocktakes/{id}/close` | librarian | Buka/tutup sesi stock opname |
| `POST /admin/scans/sync` | librarian | Sinkron batch hasil scan offline (idempoten via `client_scan_id`) |
| `GET /admin/digitization/queue?sort=priority` | librarian | Antrian judul belum ber-PDF (+ ekspor xlsx utk vendor) |
| `PATCH /admin/documents/{id}/digitization` | librarian | Ubah status/petugas digitalisasi |
| `POST /admin/documents/{id}/upload` (chunked/tus) | librarian | Upload PDF hasil scan (HP/desktop) → pipeline standar |
| `POST /documents/{slug}/digitization-requests` | member | "Ajukan versi digital" (prioritas antrian) |
| `GET /admin/reports/inventory` | librarian | Rekap inventaris (judul/eksemplar per kategori, lokasi, kondisi; ekspor xlsx) |
| `GET /admin/reports/…` | librarian | Statistik |

Konvensi: JSON, error format RFC 7807, paginasi `page/per_page`, rate limit per-IP dan per-user (ketat di `/auth/*` dan `/reader/*`).

---

## 5. Keamanan

1. **Transport & sesi:** HTTPS only (HSTS), cookie `Secure; HttpOnly; SameSite=Lax`, CSRF token untuk form.
2. **Password:** argon2id; kebijakan minimal 8 karakter; reset token sekali pakai.
3. **File:** bucket private; akses hanya via backend; tidak ada direct/presigned URL ke `masters/`; upload divalidasi (magic bytes PDF, batas ukuran, scan antivirus ClamAV pada pipeline impor).
4. **Reader:** token sesi pendek terikat user+dokumen+IP-range; watermark tertanam piksel; deteksi & throttle scraping; semua akses halaman ter-log.
5. **RBAC & audit:** semua aksi admin tercatat di `audit_logs`.
6. **Data pribadi (UU PDP):** enkripsi at-rest DB & storage, kebijakan retensi log (12 bulan), hak hapus akun (soft-delete + anonimisasi), persetujuan eksplisit saat registrasi.
7. **Infrastruktur:** container non-root, dependensi dipindai (Dependabot/`npm audit`), backup terenkripsi, secrets via env/vault — tidak di repo.

---

## 6. Kinerja & Skalabilitas

- **Pre-render semua halaman saat ingest** (bukan on-demand) → melayani baca = sekadar baca objek + stamp watermark; stamping WebP ~50–150 ms/halaman.
- Cache metadata katalog di Redis (TTL 5 menit); halaman katalog di-SSR + CDN cache.
- Halaman ber-watermark **tidak** di-cache CDN (identitas per-user); beban di-scale horizontal dengan menambah replika API (stateless).
- Estimasi storage: PDF master ~10 MB + render ~150 KB × 200 hal ≈ 40 MB/judul → 1.000 judul ≈ 40–50 GB. MinIO di VPS dengan block storage cukup.
- Target: p95 render endpoint < 300 ms (di luar network), 200 pembaca konkuren pada 2 vCPU/4 GB per replika API.

---

## 7. Deployment & Operasional

```
VPS (mis. 4 vCPU / 8 GB, lokasi Indonesia untuk latensi & residensi data)
└── Docker Compose
    ├── nginx (TLS, reverse proxy)
    ├── web (Next.js)
    ├── api (NestJS)  ×N replika
    ├── worker (BullMQ: render, OCR, import, mailer, scheduler)
    ├── postgres 16 (+ backup harian pg_dump → object storage)
    ├── redis
    └── minio (atau ganti S3/R2 terkelola)
```

- CI/CD: GitHub Actions — lint, test, build image, deploy tag.
- Observabilitas: log terstruktur (JSON) + uptime monitor; error tracking (Sentry).
- Lingkungan: `staging` dan `production` terpisah.
- Backup: DB harian (retensi 30 hari), storage sinkron mingguan ke lokasi kedua; uji restore per kuartal.

---

## 8. Keputusan Desain (ADR ringkas)

| # | Keputusan | Alasan | Konsekuensi |
|---|---|---|---|
| 1 | Render halaman **server-side ke gambar**, bukan kirim PDF + pdf.js | Satu-satunya cara file utuh tidak pernah sampai ke klien | Butuh storage & pipeline render; teks tidak selectable (memang diinginkan) |
| 2 | Watermark ditanam di piksel saat serving | Overlay DOM mudah dihapus lewat DevTools | +CPU per request (bisa di-cache per-user-per-halaman jika perlu) |
| 3 | Lisensi terbatas + antrian (model iPusnas) | Familiar bagi pengguna Indonesia, adil, melindungi penerbit | Perlu scheduler & notifikasi andal |
| 4 | Penegakan kedaluwarsa lazy-check + scheduler | Akses mati tepat waktu meski scheduler telat | Validasi tambahan tiap request halaman (murah) |
| 5 | Impor via template xlsx + pencocokan `nama_file` | Alur paling natural untuk output vendor scan / staf | Disiplin penamaan file harus dijaga (dicek oleh validasi pra-impor) |
| 6 | Modular monolith, bukan microservices | Tim kecil, biaya operasional rendah | Refactor ke service terpisah bila skala menuntut |
| 7 | Build, bukan kustomisasi SLiMS | Fitur DRM-reader & sewa digital tidak ada di SLiMS | Perlu tim pengembang; katalog standar tetap kompatibel Dublin Core |
| 8 | Inventarisasi via **PWA + kamera browser**, bukan aplikasi native | Tanpa instalasi/app store, satu codebase, scanner USB/BT tetap kompatibel | Safari iOS butuh fallback ZXing-js; pemindaian sedikit lebih lambat dari app native (masih < 1 dtk/buku) |
| 9 | Scan halaman buku memakai **aplikasi pihak ketiga (vFlat) + upload**, bukan kamera in-app | Dewarping lengkung halaman & batch capture vFlat jauh melampaui yang layak dibangun sendiri; fokus sistem pada antrian kerja & pipeline pemrosesan | Bergantung aplikasi eksternal gratis; mode capture in-app disiapkan sebagai opsi Fase 2 |

---

## 9. Rencana Pengujian (ringkas)

- **Unit & integrasi:** aturan pinjam (lisensi habis, antrian, race condition pinjam bersamaan — uji dengan transaksi paralel), kedaluwarsa akses, validasi impor.
- **E2E (Playwright):** daftar→verifikasi→login→baca; pinjam→baca→jatuh tempo→akses tertutup; impor batch 100 dokumen.
- **Keamanan:** uji akses langsung ke object storage (harus 403), replay token sesi kadaluarsa, manipulasi request halaman di luar hak, rate-limit scraping.
- **Beban:** k6 — 200 pembaca konkuren, p95 < 300 ms endpoint halaman.
- **UAT:** pustakawan menjalankan alur impor massal nyata dengan 1 batch hasil scan vendor sebelum go-live.
