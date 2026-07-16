import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import { dirname, join, normalize } from 'path';

/**
 * Penyimpanan objek berbasis disk lokal (dev/single-node).
 * Antarmuka dibuat sempit (put/get/exists dengan "object key")
 * agar mudah ditukar ke MinIO/S3 tanpa mengubah pemanggil.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = join(
      process.cwd(),
      config.get('STORAGE_DIR', 'data/storage'),
    );
    mkdirSync(this.root, { recursive: true });
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

  /** Cegah path traversal — key tidak boleh keluar dari root storage. */
  private resolve(key: string): string {
    const path = normalize(join(this.root, key));
    if (!path.startsWith(this.root)) {
      throw new Error(`Object key tidak valid: ${key}`);
    }
    return path;
  }
}
