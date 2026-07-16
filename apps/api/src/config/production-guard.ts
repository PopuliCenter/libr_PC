/**
 * Guard twelve-factor (III. Config): aplikasi harus GAGAL START di produksi
 * bila secret masih kosong atau memakai nilai default development —
 * bukan diam-diam berjalan dengan nilai yang tidak aman.
 */
const INSECURE_JWT_SECRETS = new Set(['', 'dev-secret', 'ganti-dengan-string-acak-panjang']);
const INSECURE_ADMIN_PASSWORDS = new Set(['', 'admin12345']);

export function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const problems: string[] = [];

  if (INSECURE_JWT_SECRETS.has(process.env.JWT_SECRET ?? '')) {
    problems.push(
      'JWT_SECRET belum diset atau masih nilai default. Isi dengan string acak panjang (mis. hasil `openssl rand -hex 32`).',
    );
  }
  if (INSECURE_ADMIN_PASSWORDS.has(process.env.ADMIN_PASSWORD ?? '')) {
    problems.push(
      'ADMIN_PASSWORD belum diset atau masih default. Tetapkan password superadmin yang kuat via environment.',
    );
  }
  if ((process.env.DB_TYPE ?? 'sqlite') === 'sqlite') {
    problems.push(
      'DB_TYPE masih "sqlite". Produksi harus memakai PostgreSQL (DB_TYPE=postgres).',
    );
  }
  if ((process.env.DB_SYNC ?? 'true') === 'true') {
    problems.push(
      'DB_SYNC masih "true" (skema diubah otomatis saat runtime). Set DB_SYNC=false dan pakai migration.',
    );
  }

  if (problems.length > 0) {
    console.error('\nKonfigurasi produksi tidak aman — aplikasi dihentikan:');
    problems.forEach((p) => console.error(`  ✗ ${p}`));
    console.error('');
    process.exit(1);
  }
}
