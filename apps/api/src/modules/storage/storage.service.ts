import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { readFile, writeFile, access, rm, readdir, stat } from 'fs/promises';
import { dirname, join, normalize, relative, sep } from 'path';

/**
 * Penyimpanan objek berbasis berkas dengan dua tingkat (tiering).
 *
 * Antarmuka sengaja sempit (key/value) agar mudah ditukar ke MinIO/S3
 * tanpa mengubah pemanggil. Perutean per-prefix memisahkan dua jenis data
 * yang sifatnya berbeda:
 *
 *   - DINGIN (`masters/`, `imports/`) — besar, jarang dibaca, wajib awet.
 *     Diarahkan ke STORAGE_COLD_DIR bila diisi (mis. titik mount NAS/QNAP),
 *     sehingga tidak membebani disk server aplikasi.
 *   - PANAS (`pages/`) — cache render halaman: sering dibaca, berkas kecil,
 *     dan SELALU bisa dibuat ulang dari master. Tetap di disk lokal agar
 *     membalik halaman tidak menembus jaringan setiap kali.
 *
 * Bila STORAGE_COLD_DIR kosong, semua objek jatuh ke satu root lokal —
 * perilaku identik dengan sebelum tiering diperkenalkan.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly hotRoot: string;
  private readonly coldRoot: string;

  /** Prefix yang ditempatkan di penyimpanan dingin. */
  private static readonly COLD_PREFIXES = ['masters/', 'imports/'];

  constructor(config: ConfigService) {
    this.hotRoot = this.ensureDir(
      join(process.cwd(), config.get('STORAGE_DIR', 'data/storage')),
    );
    const cold = config.get<string>('STORAGE_COLD_DIR', '').trim();
    this.coldRoot = cold ? this.ensureDir(cold) : this.hotRoot;

    if (this.coldRoot !== this.hotRoot) {
      this.logger.log(
        `Penyimpanan bertingkat aktif — dingin: ${this.coldRoot}, panas: ${this.hotRoot}`,
      );
    }
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.resolve(key);
    mkdirSync(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  /** Hapus satu objek. Objek yang memang tak ada dianggap sukses (idempoten). */
  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  /** Hapus seluruh objek di bawah satu prefix, mis. `pages/<documentId>/`. */
  async deletePrefix(prefix: string): Promise<void> {
    await rm(this.resolve(prefix), { recursive: true, force: true });
  }

  /** Daftar objek di bawah prefix beserta ukuran & waktu ubah (untuk janitor). */
  async list(prefix: string): Promise<StoredObject[]> {
    const root = this.resolve(prefix);
    const out: StoredObject[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return; // prefix belum pernah terisi
      }
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        const info = await stat(full);
        out.push({
          key: this.toKey(prefix, root, full),
          size: info.size,
          modifiedAt: info.mtime,
        });
      }
    };

    await walk(root);
    return out;
  }

  private ensureDir(path: string): string {
    const resolved = normalize(path);
    mkdirSync(resolved, { recursive: true });
    return resolved;
  }

  private rootFor(key: string): string {
    return StorageService.COLD_PREFIXES.some((p) => key.startsWith(p))
      ? this.coldRoot
      : this.hotRoot;
  }

  /** Ubah path absolut kembali menjadi object key berpemisah `/`. */
  private toKey(prefix: string, root: string, full: string): string {
    const tail = relative(root, full).split(sep).join('/');
    return `${prefix.replace(/\/$/, '')}/${tail}`;
  }

  /** Cegah path traversal — key tidak boleh keluar dari root-nya. */
  private resolve(key: string): string {
    const root = this.rootFor(key);
    const path = normalize(join(root, key));
    if (path !== root && !path.startsWith(root + sep)) {
      throw new Error(`Object key tidak valid: ${key}`);
    }
    return path;
  }
}

export interface StoredObject {
  key: string;
  size: number;
  modifiedAt: Date;
}
