/**
 * Tipe kolom tanggal berbeda antar driver: SQLite memakai "datetime",
 * PostgreSQL memakai "timestamp". Dibaca dari env proses (di produksi
 * DB_TYPE diset sebagai environment variable container, bukan file .env,
 * sehingga sudah tersedia saat decorator entity dievaluasi).
 */
export const DATETIME =
  process.env.DB_TYPE === 'postgres' ? ('timestamp' as const) : ('datetime' as const);
