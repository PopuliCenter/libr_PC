# PRD — Sistem Perpustakaan Digital Populi Center

| | |
|---|---|
| **Nama Produk** | Populi Center Digital Library (e-Library) |
| **Versi Dokumen** | 1.0 (Draft) |
| **Tanggal** | 8 Juli 2026 |
| **Pemilik Produk** | Populi Center |
| **Status** | Draft untuk review |

---

## 1. Latar Belakang & Tujuan

Populi Center memiliki koleksi publikasi, buku, laporan riset, dan hasil survei dalam bentuk fisik maupun digital. Saat ini akses terhadap koleksi tersebut terbatas. Dibutuhkan sebuah sistem perpustakaan digital yang:

1. Membuka akses koleksi kepada **publik** melalui katalog online.
2. Memungkinkan **membaca PDF secara online** langsung di browser, **tanpa bisa di-copy, print, atau download**, untuk melindungi hak cipta.
3. Menyediakan mekanisme **peminjaman/sewa digital (digital lending)** dengan **batasan waktu** baca.
4. Menyediakan **pendaftaran anggota secara online** (self-service).
5. Mendukung **digitalisasi massal** koleksi fisik (scan massal) dengan **template metadata** yang tinggal di-upload, sehingga ribuan judul bisa masuk sistem tanpa input manual satu per satu.

### Tujuan Bisnis
- Meningkatkan jangkauan dan pemanfaatan publikasi Populi Center oleh peneliti, mahasiswa, jurnalis, dan publik.
- Melindungi aset intelektual (dokumen tidak bocor dalam bentuk file utuh).
- Menekan biaya operasional input data melalui impor massal.

### Ukuran Keberhasilan (Success Metrics)
| Metrik | Target 6 bulan pertama |
|---|---|
| Jumlah anggota terdaftar | ≥ 1.000 anggota |
| Judul terdigitalisasi & terpublikasi | ≥ 500 judul |
| Sesi baca online per bulan | ≥ 2.000 sesi |
| Waktu input 1 batch (100 judul) via template | ≤ 1 jam kerja admin |
| Insiden kebocoran file PDF utuh | 0 |

---

## 2. Pengguna & Persona

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Pengunjung Umum** (tanpa login) | Publik yang menemukan katalog via web/mesin pencari | Cari & lihat detail koleksi, baca abstrak/preview, daftar jadi anggota |
| **Anggota Terdaftar** | Pengguna yang sudah registrasi & verifikasi email | Baca online koleksi open-access, ajukan sewa/pinjam koleksi terbatas, riwayat baca |
| **Pustakawan / Admin Konten** | Staf Populi Center | Kelola katalog, upload PDF, impor massal via template, kelola peminjaman |
| **Super Admin** | Pengelola sistem | Kelola user, role, konfigurasi DRM & durasi sewa, laporan |

---

## 3. Ruang Lingkup

### Dalam Lingkup (In Scope) — Fase 1
1. Katalog publik (browse, cari, filter, detail koleksi).
2. Registrasi online + verifikasi email + login.
3. Pembaca PDF online terproteksi (no copy / no print / no download).
4. Peminjaman digital berbatas waktu ("sewa baca").
5. Panel admin: manajemen koleksi, anggota, peminjaman.
6. Impor massal: upload template metadata (Excel/CSV) + upload PDF massal, dengan pencocokan otomatis.
7. Laporan dasar (statistik baca, peminjaman, anggota).
8. Inventarisasi koleksi fisik via **scan barcode di HP** (PWA): pendataan buku dengan scan ISBN + metadata otomatis, label barcode/QR internal, dan mode stock opname.
9. **Antrian digitalisasi**: sistem menandai buku fisik yang belum punya versi PDF, menyusun daftar kerja digitalisasi, dan menerima upload hasil scan (termasuk dari HP) langsung ke record buku.

### Di Luar Lingkup Fase 1 (dapat masuk fase berikutnya)
- Pembayaran online (payment gateway) — Fase 1 mengasumsikan sewa **gratis dengan kuota/antrian** atau persetujuan admin; monetisasi menyusul.
- Aplikasi mobile native (web responsive sudah mencakup mobile).
- Peminjaman buku fisik (sirkulasi fisik) — bisa ditambahkan sebagai modul lanjutan. (**Inventarisasi** fisik via scan HP sudah masuk lingkup — lihat F7; yang belum masuk hanya transaksi pinjam-kembali buku fisik.)
- Integrasi antar-perpustakaan (OAI-PMH / interlibrary loan) — Fase 2.

> **Catatan asumsi:** kata "sewa" dalam kebutuhan diartikan sebagai *akses baca berbatas waktu*. Jika ke depannya berbayar, arsitektur sudah menyiapkan hook untuk payment gateway (lihat SDD).

---

## 4. Kebutuhan Fungsional

### F1 — Katalog Publik
| ID | Kebutuhan | Prioritas |
|---|---|---|
| F1.1 | Pengunjung dapat menelusuri koleksi tanpa login (judul, penulis, tahun, kategori, kata kunci). | Wajib |
| F1.2 | Pencarian full-text pada metadata (judul, penulis, subjek, abstrak) dengan filter kategori, tahun, tipe koleksi. | Wajib |
| F1.3 | Halaman detail koleksi menampilkan: sampul, metadata lengkap, status akses (Terbuka / Perlu Login / Sewa), dan jumlah stok lisensi digital tersedia. | Wajib |
| F1.4 | Pengunjung tanpa login dapat melihat **preview terbatas** (mis. 5–10 halaman pertama, dapat dikonfigurasi per koleksi). | Sebaiknya |
| F1.5 | SEO-friendly: halaman detail dapat diindeks mesin pencari (metadata terbuka, konten PDF tidak). | Sebaiknya |

### F2 — Registrasi & Akun Anggota
| ID | Kebutuhan | Prioritas |
|---|---|---|
| F2.1 | Registrasi online dengan: nama lengkap, email, password, no. HP, institusi/pekerjaan (opsional). | Wajib |
| F2.2 | Verifikasi email (link aktivasi, kedaluwarsa 24 jam). | Wajib |
| F2.3 | Login email+password; lupa password via email reset. | Wajib |
| F2.4 | Login sosial (Google) sebagai opsi. | Sebaiknya |
| F2.5 | Profil anggota: edit data, lihat riwayat baca & peminjaman aktif. | Wajib |
| F2.6 | Persetujuan Syarat & Ketentuan + kebijakan privasi saat registrasi (kepatuhan UU PDP). | Wajib |
| F2.7 | Admin dapat menonaktifkan/memblokir akun. | Wajib |

### F3 — Baca Online Terproteksi (Protected Reader)
| ID | Kebutuhan | Prioritas |
|---|---|---|
| F3.1 | PDF dibaca melalui **web reader** di dalam aplikasi; file PDF asli **tidak pernah dikirim utuh ke browser**. Halaman disajikan sebagai render per-halaman (gambar/stream terenkripsi). | Wajib |
| F3.2 | Fungsi **copy teks, klik-kanan, print, dan download dinonaktifkan** di dalam reader. | Wajib |
| F3.3 | Setiap halaman diberi **watermark dinamis** (nama + email anggota + timestamp) sebagai deterrent screenshot. | Wajib |
| F3.4 | Navigasi reader: daftar isi/thumbnail, lompat halaman, zoom, mode gelap, lanjutkan dari halaman terakhir dibaca. | Wajib |
| F3.5 | Sesi baca menggunakan token berumur pendek; URL halaman tidak dapat dibagikan (signed URL kedaluwarsa). | Wajib |
| F3.6 | Batas perangkat/sesi bersamaan per akun (default 2 sesi) untuk mencegah sharing akun. | Sebaiknya |
| F3.7 | Reader berfungsi di desktop & mobile browser modern (Chrome, Firefox, Safari, Edge). | Wajib |

> **Batasan yang jujur:** proteksi browser (disable copy/print) bersifat *deterrent* — tidak ada teknologi web yang 100% mencegah screenshot/foto layar. Kombinasi render per-halaman + watermark identitas + signed URL adalah standar industri (model yang sama dipakai Google Books / iPusnas). Ini dinyatakan agar ekspektasi pemangku kepentingan tepat.

### F4 — Sewa / Peminjaman Digital Berbatas Waktu
| ID | Kebutuhan | Prioritas |
|---|---|---|
| F4.1 | Koleksi memiliki tipe akses: **Terbuka** (semua bisa baca), **Anggota** (perlu login), **Sewa/Pinjam** (perlu meminjam dulu). | Wajib |
| F4.2 | Anggota dapat meminjam koleksi tipe Sewa dengan durasi pilihan (mis. 1 / 3 / 7 hari — dikonfigurasi admin per koleksi). | Wajib |
| F4.3 | Setiap koleksi Sewa punya **jumlah lisensi digital (copy)**; jika semua terpakai, anggota dapat masuk **antrian (waitlist)** dan diberi notifikasi email saat tersedia. | Wajib |
| F4.4 | Akses otomatis **berakhir saat jatuh tempo** (hard cutoff — sesi baca ditutup, token dicabut). | Wajib |
| F4.5 | Anggota dapat **mengembalikan lebih awal**; lisensi kembali ke pool. | Wajib |
| F4.6 | Batas pinjaman aktif per anggota (default 3, dapat dikonfigurasi). | Wajib |
| F4.7 | Notifikasi email: peminjaman berhasil, pengingat H-1 jatuh tempo, akses berakhir, giliran antrian tiba. | Wajib |
| F4.8 | (Fase 2) Sewa berbayar via payment gateway (Midtrans/Xendit) dengan tarif per durasi. | Nanti |

### F5 — Panel Admin & Manajemen Koleksi
| ID | Kebutuhan | Prioritas |
|---|---|---|
| F5.1 | CRUD koleksi: metadata (judul, penulis, penerbit, tahun, ISBN/ISSN, kategori, subjek, abstrak, bahasa, no. panggil), sampul, file PDF. | Wajib |
| F5.2 | Pengaturan per koleksi: tipe akses, jumlah lisensi, durasi sewa yang diizinkan, jumlah halaman preview. | Wajib |
| F5.3 | Manajemen kategori/taksonomi (hierarkis). | Wajib |
| F5.4 | Manajemen anggota: cari, lihat aktivitas, blokir/aktifkan. | Wajib |
| F5.5 | Manajemen peminjaman: lihat pinjaman aktif, perpanjang/akhiri manual. | Wajib |
| F5.6 | Dasbor statistik: koleksi terpopuler, tren baca, anggota aktif, antrian terpanjang. | Sebaiknya |
| F5.7 | Audit log aktivitas admin. | Sebaiknya |

### F6 — Digitalisasi Massal & Impor via Template
| ID | Kebutuhan | Prioritas |
|---|---|---|
| F6.1 | Admin dapat **mengunduh template metadata** (Excel/CSV) berisi kolom baku + petunjuk pengisian + contoh baris. | Wajib |
| F6.2 | Admin meng-upload **template terisi** + **kumpulan file PDF** (multi-file upload / ZIP / folder). Sistem mencocokkan baris metadata ↔ file PDF via kolom `nama_file`. | Wajib |
| F6.3 | **Validasi pra-impor**: sistem menampilkan pratinjau hasil parsing, menandai baris bermasalah (file tidak ditemukan, kolom wajib kosong, duplikat ISBN/judul), admin bisa perbaiki lalu impor ulang. Baris valid bisa diimpor tanpa menunggu baris error. | Wajib |
| F6.4 | Pemrosesan otomatis pasca-impor per dokumen: pembuatan thumbnail sampul, penghitungan jumlah halaman, **OCR** untuk PDF hasil scan (agar bisa dicari full-text di masa depan), konversi ke format render terproteksi. | Wajib |
| F6.5 | Status batch impor dapat dipantau (antrian → diproses → selesai/gagal per item) dan ada laporan hasil impor yang bisa diunduh. | Wajib |
| F6.6 | Impor berjalan di background; admin tidak perlu menunggu di halaman. | Wajib |
| F6.7 | Dukungan draft: hasil impor masuk sebagai **Draft** dulu, dipublikasikan setelah review (opsional per batch, bisa langsung publish). | Sebaiknya |

#### F6.a — Alternatif Alur Scan Massal (rekomendasi operasional, bukan fitur software)
Untuk pertanyaan "adakah alternatif untuk scan secara massal": sistem ini menerima output dari alur mana pun di bawah, karena titik masuknya sama — folder PDF + template metadata.

| Opsi | Deskripsi | Cocok untuk | Perkiraan biaya |
|---|---|---|---|
| **A. Jasa digitalisasi pihak ketiga** | Kirim koleksi fisik ke vendor scanning (banyak vendor di Jakarta melayani perpustakaan/arsip; output PDF + OCR + penamaan file sesuai template kita) | Volume besar sekali jalan (>2.000 judul), staf terbatas | Per lembar/halaman; paling cepat |
| **B. Scanner dokumen ADF sendiri** | Scanner dengan Automatic Document Feeder (mis. Fujitsu/Ricoh fi-series, ScanSnap) — cocok untuk dokumen lepas/laporan yang boleh dilepas jilidnya | Laporan riset, publikasi lepas, arsip kertas | Investasi alat 1x (~Rp10–40 jt), operasional murah |
| **C. Book scanner overhead (V-cradle)** | Scanner buku non-destruktif (mis. CZUR, Fujitsu SV600) — buku tidak perlu dibongkar | Buku terjilid, koleksi langka | Alat ~Rp5–25 jt, lebih lambat per halaman |
| **D. Smartphone + aplikasi scan** | vFlat Scan / Adobe Scan dengan tripod — kualitas cukup baik untuk teks | Volume kecil, darurat, koleksi tercecer | Hampir gratis, paling lambat |

Rekomendasi umum: **kombinasi A untuk backlog awal + B/C untuk operasional rutin**. Apa pun opsinya, kesepakatan penamaan file (`nama_file` di template) ditetapkan **sebelum** scanning dimulai.

### F7 — Inventarisasi Koleksi Fisik via Scan HP
Tujuan: mendata dan merekap koleksi fisik dengan cepat menggunakan kamera HP, tanpa alat khusus dan tanpa install aplikasi (web app / PWA yang dibuka di browser HP).

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F7.1 | Pustakawan dapat membuka **mode scan** di HP: kamera memindai **barcode ISBN** di sampul belakang buku. | Wajib |
| F7.2 | Setelah ISBN terbaca, sistem **mengambil metadata otomatis** (judul, penulis, penerbit, tahun, sampul) dari layanan bibliografi publik (Google Books / Open Library); pustakawan tinggal konfirmasi/koreksi → tersimpan sebagai record koleksi + eksemplar fisik. | Wajib |
| F7.3 | Satu judul dapat memiliki **banyak eksemplar** (kopi fisik), masing-masing dengan nomor induk/inventaris unik, lokasi rak, kondisi, sumber (beli/hibah), dan tanggal perolehan. | Wajib |
| F7.4 | Untuk koleksi **tanpa ISBN** (laporan internal, terbitan lama), sistem dapat **menerbitkan label barcode/QR internal** (nomor induk) yang dapat dicetak per-batch (lembar stiker A4) lalu ditempel di buku. | Wajib |
| F7.5 | **Mode stock opname**: pustakawan memilih sesi opname → menyusuri rak sambil scan tiap buku → sistem menandai "terverifikasi"; di akhir sesi tersedia laporan **buku hilang / belum ter-scan / salah lokasi**, dapat diunduh (xlsx). | Wajib |
| F7.6 | Scan berfungsi **offline-tolerant**: bila sinyal putus di sela rak, hasil scan diantrikan di perangkat dan tersinkron saat online kembali. | Sebaiknya |
| F7.7 | Duplikat terdeteksi saat scan: ISBN/nomor induk yang sudah terdaftar menampilkan record lama (tambah eksemplar, bukan judul baru). | Wajib |
| F7.8 | Rekap inventaris: total judul & eksemplar per kategori/lokasi/kondisi, ekspor xlsx. | Wajib |
| F7.9 | Keterkaitan dengan digitalisasi: record hasil scan ISBN dapat **ditautkan ke file PDF hasil scan massal** (F6) di kemudian hari, sehingga satu judul punya wujud fisik + digital sekaligus. | Sebaiknya |

> **Catatan teknis:** pemindaian memakai kamera browser (tanpa install app). Scanner barcode fisik (USB/Bluetooth) juga otomatis didukung karena bekerja seperti keyboard — cocok bila nanti volume tinggi di meja sirkulasi.

### F8 — Antrian Digitalisasi & Scan-to-PDF
Tujuan: buku fisik yang **belum punya versi PDF** mudah ditemukan, diprioritaskan, dan didigitalisasi satu per satu (termasuk memakai HP), tanpa menunggu proyek scan massal.

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F8.1 | Sistem otomatis menandai judul yang punya eksemplar fisik tetapi **belum punya file digital** → tampil di halaman **"Antrian Digitalisasi"** (filter kategori, tahun, popularitas). | Wajib |
| F8.2 | Dari antrian, pustakawan dapat mengubah status per judul: `Belum` → `Sedang discan` → `Selesai`, agar dua orang tidak menscan buku yang sama. | Wajib |
| F8.3 | **Upload PDF langsung dari HP maupun desktop** ke record judul tersebut; file diproses pipeline yang sama dengan impor massal (render halaman terproteksi, thumbnail, OCR, jumlah halaman). | Wajib |
| F8.4 | **Alur scan HP yang direkomendasikan** (didokumentasikan di layar bantuan): scan buku dengan aplikasi **vFlat Scan** (gratis; auto-crop, koreksi lengkung halaman, batch 2 halaman sekaligus) → ekspor PDF → buka record buku di browser HP → upload. Satu buku ±200 halaman ≈ 30–45 menit. | Wajib |
| F8.5 | Anggota dapat menekan tombol **"Ajukan versi digital"** pada koleksi yang hanya tersedia fisik; jumlah pengajuan menjadi dasar **prioritas** antrian digitalisasi. | Sebaiknya |
| F8.6 | (Fase 2) Mode **capture dalam aplikasi**: kamera PWA memotret halaman per halaman → server merakit menjadi PDF + koreksi kemiringan + OCR — untuk kondisi tanpa aplikasi pihak ketiga. | Nanti |
| F8.7 | Setiap judul menandai **status hak cipta** (karya sendiri / berizin / tanpa izin); judul tanpa izin tetap boleh didigitalisasi untuk **arsip internal** tetapi tidak bisa dipublikasikan ke katalog (hanya preview/metadata). | Wajib |

> **Kualitas hasil scan HP:** cukup baik untuk baca online & OCR teks (vFlat ±300 dpi efektif). Untuk koleksi bernilai arsip tinggi atau cetakan halus, tetap gunakan opsi B/C di F6.a. Antrian digitalisasi ini juga berfungsi sebagai **daftar kiriman ke vendor** (ekspor xlsx) bila backlog diserahkan ke pihak ketiga.

---

## 5. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Keamanan** | HTTPS wajib; password di-hash (bcrypt/argon2); file PDF master tersimpan terenkripsi & tidak pernah ter-ekspos via URL publik; rate limiting pada login & API reader; kepatuhan UU PDP untuk data anggota. |
| **Kinerja** | Halaman katalog < 2 detik; render halaman reader < 1,5 detik per halaman pada koneksi 4G; mendukung 200 pembaca bersamaan (dapat diskalakan). |
| **Ketersediaan** | Target uptime 99,5%; backup database harian & file storage mingguan. |
| **Skalabilitas** | Arsitektur mendukung pertumbuhan hingga 50.000 judul & 100.000 anggota tanpa redesain. |
| **Aksesibilitas & UX** | Responsive (mobile-first untuk katalog & reader); Bahasa Indonesia sebagai bahasa utama UI. |
| **Auditabilitas** | Semua akses baca & peminjaman tercatat (siapa, apa, kapan). |

---

## 6. Alur Pengguna Utama (Ringkas)

1. **Daftar → Baca:** Pengunjung menemukan koleksi di katalog → klik "Baca" → diminta login/daftar → verifikasi email → kembali ke koleksi → baca di protected reader.
2. **Sewa:** Anggota membuka koleksi tipe Sewa → pilih durasi → lisensi tersedia? → Ya: akses aktif s.d. jatuh tempo → habis: akses tertutup otomatis. Tidak tersedia: masuk antrian → email saat giliran tiba.
3. **Impor massal:** Admin unduh template → tim scan mengisi template + menamai file PDF → admin upload ZIP + template → sistem validasi → admin konfirmasi → background job memproses (OCR, thumbnail, konversi) → koleksi tampil sebagai draft → publish.

---

## 7. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Ekspektasi "anti-copy 100%" tidak realistis (screenshot/foto layar) | Kekecewaan stakeholder / kebocoran konten | Edukasi sejak awal; watermark identitas per halaman; pembatasan sesi; audit log |
| Kualitas scan buruk → OCR gagal | Pencarian full-text tidak akurat | SOP kualitas scan (min. 300 dpi); validasi sampel sebelum batch besar |
| Penamaan file tidak konsisten dari vendor scan | Impor massal gagal cocok | Kontrak vendor mewajibkan konvensi penamaan; validasi pra-impor menangkap ketidakcocokan |
| Hak cipta koleksi pihak ketiga | Risiko hukum | Field status hak cipta per koleksi; koleksi tanpa izin hanya preview/metadata |
| Beban server render halaman saat trafik tinggi | Reader lambat | Cache halaman ter-render di CDN/storage; pre-render saat impor |

---

## 8. Rilis Bertahap

| Fase | Isi | Estimasi |
|---|---|---|
| **MVP (Fase 1a)** | Katalog publik, registrasi, protected reader, koleksi tipe Terbuka/Anggota, admin CRUD, impor massal dasar | 8–10 minggu |
| **Fase 1b** | Modul sewa berbatas waktu + antrian + notifikasi email, OCR pipeline, dasbor statistik, inventarisasi scan HP (F7), antrian digitalisasi (F8) | +4–6 minggu |
| **Fase 2** | Sewa berbayar (payment gateway), login Google, sirkulasi fisik, OAI-PMH, serta butir prioritas dari Roadmap Integrasi (Bab 9) | sesuai kebutuhan |

---

## 9. Roadmap Integrasi Layanan Populi Center & Penyempurnaan (Fase 2–3)

Arah besar: perpustakaan ini bukan sistem yang berdiri sendiri, melainkan **pintu diseminasi riset Populi Center** — terhubung dengan website, aplikasi survei, kegiatan publik, dan jejaring perpustakaan nasional.

### 9.1 Integrasi dengan ekosistem Populi Center

| # | Fitur | Nilai | Prasyarat teknis |
|---|---|---|---|
| I1 ✅ | **Akun tunggal Populi (SSO/OIDC)** — satu akun untuk e-library, aplikasi survei, pendaftaran acara, dan layanan lain | Anggota cukup daftar sekali; data audiens terkonsolidasi | **Terimplementasi**: e-library menjadi **OpenID Connect Provider** (Authorization Code + PKCE, id_token RS256 + JWKS, userinfo, refresh). Aplikasi survei tinggal jadi klien OAuth. Lihat `apps/api` modul `oauth/` & README §SSO. Alternatif external IdP (Keycloak) tetap kompatibel. |
| I2 ⛔ | ~~**Repositori data survei**~~ — **Out of scope.** Diputuskan tidak relevan untuk perpustakaan publik ini; pengelolaan/permintaan dataset survei lebih cocok ditangani sistem riset internal Populi, bukan e-library. | — | — |
| I3 ✅ | **Widget & API untuk website utama** — blok "Publikasi Terbaru" di populicenter.org otomatis menarik dari katalog; tautan "Baca di e-Library" | Satu sumber kebenaran; tak ada upload dobel ke website & library | **Terimplementasi**: modul `syndication/` — widget tersemat 1-baris `<script>` (`widget.js` + `widget/publications` JSON ber-CORS) + umpan **RSS 2.0** `feed.rss` (filter `?category`) dgn auto-discovery. Contoh: `apps/web/public/widget-contoh.html`. |
| I4 ✅ | **Tautan acara & multimedia** — record publikasi memuat tautan peluncuran/diskusi (YouTube, podcast); sebaliknya halaman acara menaut ke publikasi | Konteks lengkap: baca laporannya, tonton diskusinya | **Terimplementasi**: `relatedLinks[]` (kind/title/url, tervalidasi) per dokumen + tipe koleksi `video`/`audio`; halaman detail merender **embed aman** (allowlist YouTube/Spotify/SoundCloud) + daftar tautan; editor di form admin. Tautan detail publik = jalur balik dari halaman acara. |
| I5 ✅ | **Notifikasi WhatsApp** — pengingat jatuh tempo sewa, giliran antrian, terbitan baru sesuai minat | Email sering tak terbaca di Indonesia; WA jauh lebih efektif | **Terimplementasi** (pengingat sewa & antrian): channel WA berdampingan dengan email di `NotificationsListener`; modul `whatsapp/` provider-agnostik (log/Fonnte/Meta Cloud API), normalisasi nomor, degradasi anggun. "Terbitan baru sesuai minat" menyusul dgn I6 (segmentasi). |
| I6 ✅ | **Newsletter & segmentasi minat** — saat daftar, anggota memilih topik minat (politik, ekonomi, pemilu…); terbitan baru memicu email/WA ke segmen terkait (dengan consent UU PDP) | Diseminasi aktif, bukan menunggu dikunjungi | **Terimplementasi**: `interests[]` (slug kategori) + `newsletterConsent` pada user; event `document.published` → notifikasi tersegmentasi (email+WA) ke anggota yang minatnya cocok & consent; `announcedAt` idempoten; UI pilih minat di daftar & akun. Integrasi ESP eksternal (Mailchimp/listmonk) opsional menyusul. |
| I7 ✅ | **Analitik diseminasi** — dasbor: publikasi mana paling dibaca, oleh segmen mana (institusi, wilayah), tren topik | Bahan laporan dampak ke funder & manajemen | **Terimplementasi**: modul `analytics/` — dasbor `/admin/analitik` (pembacaan, publikasi terpopuler, per **institusi**, per **topik/kategori**, tren) + unduh xlsx, rentang 30/90/365/semua. Sumber = `reading_sessions`/`loans`/`holds`/`users`/`documents` Fase 1 (bukan tabel `reading_events` terpisah). **Catatan:** segmen "wilayah" belum ada (butuh field `region` pada user — kolom kosong yang belum diisi saat registrasi). |

### 9.2 Integrasi jejaring perpustakaan & akademik

| # | Fitur | Nilai | Prasyarat teknis |
|---|---|---|---|
| I8 | **Indonesia OneSearch (Perpusnas) via OAI-PMH** — katalog ter-harvest otomatis ke jejaring perpustakaan nasional | Ditemukan oleh seluruh pemustaka Indonesia | Endpoint OAI-PMH (metadata sudah Dublin Core–compatible sejak Fase 1 — memang disiapkan untuk ini) |
| I9 ✅ | **Sitasi siap pakai** — tombol "Kutip" (APA/Chicago/BibTeX) di tiap halaman detail; metadata Google Scholar (`citation_*` meta tags) | Memudahkan akademisi mengutip; naik di Scholar | **Terimplementasi**: komponen Kutip (`CiteBox`) + `lib/citations.ts`; halaman detail jadi server component dengan `generateMetadata` yang merender `citation_*` di server (terindeks Scholar). |
| I10 ✅* | **DOI untuk publikasi resmi** (Crossref/DataCite) | Publikasi tersitasi permanen, terlacak | **Terimplementasi (field + propagasi)**: `documents.doi` (normalisasi URL→DOI, validasi pola `10.xxxx/suffix`); ditampilkan sbg tautan di detail & disebar ke sitasi APA/Chicago/BibTeX, meta Google Scholar `citation_doi`, OAI-PMH `dc:identifier`, & RSS. **\*Belum:** registrasi/deposit DOI otomatis ke Crossref/DataCite (butuh keanggotaan + kredensial) — DOI dimasukkan manual oleh admin. |

### 9.3 Penyempurnaan produk

| # | Fitur | Nilai |
|---|---|---|
| P1 ✅ | **Koleksi internal (role-based)** — laporan klien/draft hanya untuk peneliti internal; e-library sekaligus jadi arsip pengetahuan lembaga | **Terimplementasi**: tipe akses `INTERNAL` + flag `user.isInternal`; koleksi internal disembunyikan dari katalog publik, detail (404), reader, **OAI harvest, RSS, & widget** — hanya peneliti internal (atau pustakawan/superadmin) yang melihatnya. Auth opsional pada katalog publik (satu katalog untuk semua). Superadmin menandai anggota internal via `/admin/pengguna`. |
| P2 | **Pencarian semantik & tanya-jawab koleksi (RAG)** — pengguna bertanya "apa temuan Populi soal partisipasi pemilih muda?" → jawaban dengan rujukan halaman, dibaca di protected reader | Hasil OCR Fase 1 menjadi bahan baku langsung; pembeda kuat dibanding perpustakaan lain |
| P3 ✅ | **Rekomendasi bacaan** — "yang membaca ini juga membaca…". **Terimplementasi**: `GET /documents/:id/recommendations` — collaborative filtering item-item dari `reading_sessions` (co-read), dengan fallback kategori & terbitan terbaru saat data jarang (cold-start); koleksi INTERNAL & koleksi sumber dikecualikan. Tampil di halaman detail dengan label dasar (Dibaca bersama / Topik serupa / Terbitan terbaru). |
| P4 ✅ | **Multibahasa (ID/EN)** — katalog & metadata dwibahasa untuk audiens internasional/funder. **Terimplementasi**: `documents.titleEn`/`abstractEn`; pengalih bahasa (ID/EN) di header; konten & label permukaan publik (katalog, kartu, halaman detail) terlokalisasi dgn fallback ke ID; pencarian mencakup teks Inggris; OAI-PMH `dc:title`/`dc:description` ber-`xml:lang` (id+en). Alat internal (admin/reader) tetap ID. |
| P5 ✅ | **Anotasi pribadi** — anggota menandai halaman & mencatat. **Terimplementasi**: modul `annotations/` + panel "Catatan" di protected reader (tambah per halaman, lompat ke halaman, edit/hapus). Tersimpan **per akun di basis data, bukan di berkas** → proteksi/watermark master tetap utuh. Privat per pengguna (tak bisa lihat/ubah catatan orang lain). |
| P6 ✅ | **Statistik publik** — halaman "dampak" (jumlah baca, unduhan data, sitasi) sebagai alat akuntabilitas lembaga. **Terimplementasi**: `GET /impact` (agregat aman, tanpa PII/segmen, INTERNAL dikecualikan) + halaman publik `/dampak` (SSR): publikasi, kali dibaca, anggota, bidang topik, peminjaman + koleksi paling dibaca. **Catatan:** "unduhan data" & "sitasi" belum dilacak (protected reader tanpa unduh; klik tombol Kutip belum direkam) — jadi tak ditampilkan agar tak menyesatkan. |

### 9.4 Urutan yang disarankan

1. **Cepat & murah, kerjakan dulu (bersamaan akhir Fase 1b):** ~~I9 (sitasi)~~ **✅**, ~~I3 (widget website)~~ **✅**, ~~I4 (tautan acara)~~ **✅**.
2. **Gelombang integrasi pertama (Fase 2):** ~~I5 (WhatsApp)~~ **✅**, ~~I6 (segmentasi minat)~~ **✅**, ~~I8 (OneSearch)~~ **✅ (OAI-PMH)**, P1 (koleksi internal).
3. **Strategis (Fase 2–3):** ~~I1 (SSO)~~ **✅**, ~~I2 (repositori data survei)~~ ⛔ out-of-scope, ~~I7 (analitik)~~ **✅**. Berikutnya: I10 (DOI).
4. **Diferensiasi (Fase 3):** P2 (RAG/tanya-jawab), P3 (rekomendasi), P4–P6.
