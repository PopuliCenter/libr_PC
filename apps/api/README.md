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
| `GET /oai?verb=Identify` dll. | publik | OAI-PMH: Identify, ListMetadataFormats, ListIdentifiers, ListRecords, GetRecord (oai_dc) |
| `POST /chat/messages` | publik (rate-limited) | Chat bantuan; `GET /chat/sessions/:id/messages` untuk riwayat |

## Chat AI

- Isi `ANTHROPIC_API_KEY` → jawaban dihasilkan Claude (`CHAT_MODEL`, default `claude-opus-4-8`) dengan grounding wajib ke katalog melalui tool `search_catalog` — model tidak boleh mengarang koleksi.
- Kosongkan → mode FAQ rule-based + pencarian kata kunci katalog. Bila Claude error saat runtime (kuota/jaringan), sistem otomatis turun ke mode FAQ.

## Integrasi jejaring perpustakaan (OAI-PMH)

Endpoint `/api/v1/oai` mengikuti OAI-PMH 2.0 dengan metadata `oai_dc` (Dublin Core). Untuk didaftarkan ke **Indonesia OneSearch**: deploy API pada URL publik HTTPS, set `OAI_BASE_URL`, lalu daftarkan base URL tersebut di onesearch.id (menu keanggotaan repositori). Hanya koleksi berstatus `PUBLISHED` yang di-harvest.

## Produksi

- Set `DB_TYPE=postgres` + kredensialnya, `DB_SYNC=false` (pakai migration), `JWT_SECRET` acak kuat.
- Ganti `MailService.send()` dengan SMTP/provider sungguhan.
- Modul berikutnya (lihat task list / SDD): protected reader, sewa digital, impor massal, frontend web.
