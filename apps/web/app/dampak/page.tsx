import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL, PublicImpact } from '../../lib/api';

export const metadata: Metadata = {
  title: 'Dampak & Akuntabilitas — Populi Library',
  description:
    'Statistik terbuka Perpustakaan Digital Populi Center: jumlah publikasi, pembacaan, dan koleksi paling dibaca — sebagai bentuk akuntabilitas diseminasi riset.',
};

async function getImpact(): Promise<PublicImpact | null> {
  try {
    const res = await fetch(`${API_URL}/impact`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const nf = (n: number) => n.toLocaleString('id-ID');

const STATS: { key: keyof PublicImpact['totals']; label: string; hint: string }[] = [
  { key: 'publications', label: 'Publikasi terbuka', hint: 'koleksi dapat diakses publik/anggota' },
  { key: 'reads', label: 'Kali dibaca', hint: 'total sesi baca daring' },
  { key: 'members', label: 'Anggota terdaftar', hint: 'akun aktif' },
  { key: 'categories', label: 'Bidang topik', hint: 'cakupan kategori koleksi' },
  { key: 'loans', label: 'Peminjaman digital', hint: 'total sepanjang waktu' },
];

export default async function ImpactPage() {
  const data = await getImpact();

  return (
    <div className="container page">
      <h1 className="page-title">Dampak & Akuntabilitas</h1>
      <p className="page-sub" style={{ maxWidth: 640 }}>
        Perpustakaan Digital Populi Center menjadikan riset kami dapat diakses luas.
        Angka berikut kami buka sebagai bentuk akuntabilitas diseminasi pengetahuan
        kepada publik, mitra, dan pendukung.
      </p>

      {!data ? (
        <div className="alert info">Statistik sedang tidak tersedia. Coba lagi nanti.</div>
      ) : (
        <>
          <div className="kpi-grid">
            {STATS.map((s) => (
              <div key={s.key} className="kpi-card" title={s.hint}>
                <b>{nf(data.totals[s.key])}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {data.topPublic.length > 0 && (
            <section className="card">
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Publikasi Paling Dibaca</h2>
              <ol className="impact-top">
                {data.topPublic.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/katalog/${d.slug}`}>{d.title}</Link>
                    <span className="impact-meta">
                      {d.category ? `${d.category} · ` : ''}{nf(d.reads)} kali dibaca
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 20 }}>
            Angka pembacaan dihitung dari sesi baca daring koleksi publik; koleksi
            internal tidak disertakan. Diperbarui berkala.
          </p>
        </>
      )}
    </div>
  );
}
