# Populi Library API

Backend Perpustakaan Digital Populi Center — NestJS + TypeORM (SQLite dev / PostgreSQL prod).

## Menjalankan (development)

```bash
cd apps/api
npm install
copy .env.example .env   # sesuaikan isinya
npm run start:dev        # http://localhost:3001/api/v1
```

Tanpa konfigurasi apa pun, aplikasi memakai SQLite (`data/library.dev.sqlite`) dan membuat akun superadmin awal `admin@populicenter.org` / `admin12345` (**wajib diganti** via env `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Struktur modul

```
src/
├── common/            # guard (JWT, roles), decorator (@Public, @Roles, @Audited), interceptor audit
├── config/ database/  # koneksi DB (env-driven: sqlite/postgres)
└── modules/
    ├── auth/          # register + verifikasi email, login JWT, refresh, Google OAuth
    ├── users/         # entity & service pengguna + seed superadmin
    ├── catalog/       # documents + categories (publik & admin)
    ├── audit/         # audit log (interceptor @Audited + endpoint superadmin)
    ├── oai/           # OAI-PMH 2.0 (oai_dc) utk Indonesia OneSearch
    ├── chat/          # chat bantuan: Claude (tool-use ke katalog) / fallback FAQ
    ├── mail/          # pengirim email (dev: log; prod: ganti SMTP)
    └── health/
```

## Endpoint utama

| Method & Path | Akses | Keterangan |
|---|---|---|
| `POST /auth/register` → `POST /auth/verify-email` | publik | Registrasi + verifikasi (dev: tautan verifikasi muncul di log server) |
| `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` | publik/member | Autentikasi JWT |
| `GET /auth/google` → callback | publik | Login Google (503 bila `GOOGLE_CLIENT_ID` kosong) |
| `GET /documents?query=&category=&year=&type=` | publik | Pencarian katalog (hanya PUBLISHED) |
| `GET /documents/:slug` | publik | Detail koleksi |
| `GET /categories` | publik | Daftar kategori |
| `POST/PATCH/DELETE /admin/documents` | librarian+ | CRUD koleksi (ter-audit) |
| `GET /admin/audit-logs` | superadmin | Query audit log |
| `POST /loans` · `POST /loans/:id/return` · `GET /me/loans` | member | Sewa digital: kuota lisensi per koleksi, batas 3 pinjaman aktif, kedaluwarsa otomatis (lazy check + cron per menit) |
| `GET /documents/:id/availability` | member | Ketersediaan + posisi antrian user (dipakai UI menentukan Pinjam/Antre/Klaim/Baca) |
| `POST /holds` · `POST /holds/:id/claim` · `POST /holds/:id/cancel` · `GET /me/holds` | member | Antrian FIFO saat lisensi penuh; tawaran jendela klaim 24 jam (cron per menit) |
| `POST /reader/sessions` → `GET /reader/sessions/:id/pages/:n` | member | Protected reader: halaman dirender server-side (MuPDF) ber-watermark identitas; `no-store`; tipe LOAN wajib pinjaman aktif |
| `POST /admin/documents/:id/upload` | librarian+ | Upload PDF master (multipart `file`, validasi magic bytes, hitung halaman) |
| `GET /admin/import/template` | librarian+ | Unduh template Excel (sheet Koleksi + Petunjuk) |
| `POST /admin/import/batches` (ZIP) → `POST .../:id/commit` | librarian+ | Impor massal: unggah ZIP (template+PDF) → validasi pra-impor → impor background (buat koleksi, master PDF, hitung halaman, idempoten via checksum) |
| `GET /admin/import/batches/:id` · `.../:id/report` | librarian+ | Pantau status per item + unduh laporan xlsx |
| `GET /oai?verb=Identify` dll. | publik | OAI-PMH: Identify, ListMetadataFormats, ListIdentifiers, ListRecords, GetRecord (oai_dc) |
| `POST /chat/messages` | publik (rate-limited) | Chat bantuan; `GET /chat/sessions/:id/messages` untuk riwayat |

## Chat AI

- Isi `ANTHROPIC_API_KEY` → jawaban dihasilkan Claude (`CHAT_MODEL`, default `claude-opus-4-8`) dengan grounding wajib ke katalog melalui tool `search_catalog` — model tidak boleh mengarang koleksi.
- Kosongkan → mode FAQ rule-based + pencarian kata kunci katalog. Bila Claude error saat runtime (kuota/jaringan), sistem otomatis turun ke mode FAQ.

## Integrasi jejaring perpustakaan (OAI-PMH)

Endpoint `/api/v1/oai` mengikuti OAI-PMH 2.0 dengan metadata `oai_dc` (Dublin Core). Untuk didaftarkan ke **Indonesia OneSearch**: deploy API pada URL publik HTTPS, set `OAI_BASE_URL`, lalu daftarkan base URL tersebut di onesearch.id (menu keanggotaan repositori). Hanya koleksi berstatus `PUBLISHED` yang di-harvest.

## Migration database (PostgreSQL)

Skema produksi dikelola migration TypeORM (bukan `synchronize`). Saat aplikasi boot
dengan `DB_SYNC=false`, migration yang belum jalan dieksekusi otomatis.

```bash
# generate migration baru setelah mengubah entity (butuh PG berjalan, mis. docker compose up -d postgres)
DB_TYPE=postgres DB_PORT=5433 npm run migration:generate -- src/database/migrations/NamaPerubahan

# jalankan / batalkan manual
DB_TYPE=postgres DB_PORT=5433 npm run migration:run
DB_TYPE=postgres DB_PORT=5433 npm run migration:revert
```

## Menjalankan dengan Docker (produksi-like)

Dari root repo:

```bash
copy .env.example .env     # isi JWT_SECRET & ADMIN_PASSWORD (wajib — guard menolak default)
docker compose up -d --build
# web: http://localhost:3000 | api: http://localhost:3001 | postgres: localhost:5433
```

Aplikasi **menolak start** di `NODE_ENV=production` bila `JWT_SECRET`/`ADMIN_PASSWORD`
masih kosong/default, `DB_TYPE` bukan postgres, atau `DB_SYNC` masih true
(lihat `src/config/production-guard.ts`).

## Produksi

- Ganti `MailService.send()` dengan SMTP/provider sungguhan.
- Modul berikutnya (lihat task list / SDD): protected reader, sewa digital, impor massal.
