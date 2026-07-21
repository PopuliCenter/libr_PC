#!/usr/bin/env node
/**
 * Pindahkan objek "dingin" (masters/, imports/) dari penyimpanan lokal ke
 * STORAGE_COLD_DIR — mis. titik mount NAS/QNAP.
 *
 * Kode aplikasi sengaja TIDAK memindahkan sendiri saat start: memindahkan
 * puluhan GB diam-diam bukan sesuatu yang pantas terjadi tanpa diminta.
 *
 * Aman diulang: setiap berkas disalin, diverifikasi dengan checksum SHA-256,
 * baru sumbernya dihapus. Berkas yang sudah ada di tujuan dengan checksum
 * sama dilewati. Bila proses terputus, jalankan lagi.
 *
 * Pakai:
 *   node scripts/migrate-cold-storage.js --dry-run   # lihat rencana saja
 *   node scripts/migrate-cold-storage.js             # jalankan
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const COLD_PREFIXES = ['masters', 'imports'];
const DRY_RUN = process.argv.includes('--dry-run');
const API_ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const file = path.join(API_ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .on('data', (d) => hash.update(d))
      .on('end', resolve)
      .on('error', reject);
  });
  return hash.digest('hex');
}

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);

(async () => {
  const env = { ...loadEnv(), ...process.env };
  const hot = path.resolve(API_ROOT, env.STORAGE_DIR || 'data/storage');
  const cold = (env.STORAGE_COLD_DIR || '').trim();

  if (!cold) {
    console.error('STORAGE_COLD_DIR belum diisi di .env — tidak ada tujuan pemindahan.');
    process.exit(1);
  }
  if (!fs.existsSync(cold)) {
    console.error(`Tujuan tidak ada / belum ter-mount: ${cold}`);
    console.error('Pastikan NAS sudah ter-mount sebelum menjalankan skrip ini.');
    process.exit(1);
  }
  // Tulis-uji: mount read-only atau tanpa izin akan gagal di sini, bukan
  // di tengah pemindahan ketika sumber sudah sebagian terhapus.
  const probe = path.join(cold, `.tulis-uji-${process.pid}`);
  try {
    await fsp.writeFile(probe, 'ok');
    await fsp.rm(probe);
  } catch (err) {
    console.error(`Tujuan tidak bisa ditulis: ${cold}\n  ${err.message}`);
    process.exit(1);
  }

  console.log(`Sumber : ${hot}`);
  console.log(`Tujuan : ${cold}`);
  console.log(DRY_RUN ? 'Mode   : simulasi (tidak ada yang diubah)\n' : 'Mode   : jalan\n');

  let moved = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  for (const prefix of COLD_PREFIXES) {
    const files = await walk(path.join(hot, prefix));
    if (files.length === 0) {
      console.log(`${prefix}/ — tidak ada berkas`);
      continue;
    }
    console.log(`${prefix}/ — ${files.length} berkas`);

    for (const src of files) {
      const rel = path.relative(hot, src);
      const dest = path.join(cold, rel);
      const size = (await fsp.stat(src)).size;

      if (DRY_RUN) {
        console.log(`  akan pindah  ${rel} (${mb(size)} MB)`);
        moved++;
        bytes += size;
        continue;
      }

      try {
        const digest = await sha256(src);
        if (fs.existsSync(dest) && (await sha256(dest)) === digest) {
          await fsp.rm(src); // sudah pernah dipindah, sumbernya sisa
          console.log(`  lewat        ${rel} (sudah ada, checksum sama)`);
          skipped++;
          continue;
        }

        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.copyFile(src, dest);
        if ((await sha256(dest)) !== digest) {
          throw new Error('checksum tujuan tidak cocok setelah salin');
        }
        await fsp.rm(src); // hapus sumber hanya setelah tujuan terverifikasi
        console.log(`  pindah       ${rel} (${mb(size)} MB)`);
        moved++;
        bytes += size;
      } catch (err) {
        console.error(`  GAGAL        ${rel} — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(
    `\nSelesai: ${moved} dipindah (${mb(bytes)} MB), ${skipped} dilewati, ${failed} gagal.`,
  );
  if (failed > 0) {
    console.error('Berkas yang gagal MASIH ADA di sumber — aman untuk dijalankan ulang.');
    process.exit(1);
  }
})();
