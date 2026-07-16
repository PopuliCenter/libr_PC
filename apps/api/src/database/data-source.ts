import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';

/**
 * DataSource untuk TypeORM CLI (generate/run migration) — selalu PostgreSQL.
 *
 * PENTING: set env DB_TYPE=postgres saat memakai CLI ini agar tipe kolom
 * tanggal di entity ter-resolve ke "timestamp" (lihat column-types.ts).
 *
 * Contoh:
 *   DB_TYPE=postgres npm run migration:generate -- src/database/migrations/NamaMigrasi
 *   DB_TYPE=postgres npm run migration:run
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'library',
  password: process.env.DB_PASSWORD ?? 'library',
  database: process.env.DB_NAME ?? 'populi_library',
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.js')],
  migrations: [join(__dirname, 'migrations', '*.js')],
});
