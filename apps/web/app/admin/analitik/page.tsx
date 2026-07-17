'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { AnalyticsDashboard, api, apiDownload } from '../../../lib/api';

const RANGES: { label: string; days: number }[] = [
  { label: '30 hari', days: 30 },
  { label: '90 hari', days: 90 },
  { label: '1 tahun', days: 365 },
  { label: 'Semua', days: 0 },
];

const KPIS: { key: keyof AnalyticsDashboard['overview']; label: string }[] = [
  { key: 'reads', label: 'Pembacaan' },
  { key: 'uniqueReaders', label: 'Pembaca unik' },
  { key: 'loans', label: 'Peminjaman' },
  { key: 'publishedDocuments', label: 'Koleksi terbit' },
  { key: 'totalMembers', label: 'Anggota aktif' },
  { key: 'newMembers', label: 'Anggota baru' },
  { key: 'waitlist', label: 'Antre' },
  { key: 'activeLoans', label: 'Pinjaman aktif' },
];

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin =
    user && (user.role === 'librarian' || user.role === 'superadmin');

  const load = useCallback(async (d: number) => {
    setBusy(true);
    try {
      setData(await api.get<AnalyticsDashboard>(`/admin/analytics?days=${d}`));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load(days).catch(() => undefined);
  }, [isAdmin, days, load]);

  if (loading) return <div className="container page"><p>Memuat…</p></div>;
  if (!isAdmin) {
    return (
      <div className="container page">
        <div className="alert error">
          Halaman ini khusus pustakawan. <Link href="/masuk">Masuk</Link>.
        </div>
      </div>
    );
  }

  const maxInst = Math.max(1, ...(data?.byInstitution.map((r) => r.reads) ?? [1]));
  const maxCat = Math.max(1, ...(data?.byCategory.map((r) => r.reads) ?? [1]));
  const maxTrend = Math.max(1, ...(data?.trend.map((r) => r.reads) ?? [1]));

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Analitik Diseminasi</h1>
          <p className="page-sub">Seberapa jauh publikasi Populi menjangkau pembaca.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="inv-tabs" style={{ margin: 0 }}>
            {RANGES.map((r) => (
              <button
                key={r.days}
                className={r.days === days ? 'active' : ''}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            className="btn secondary"
            onClick={() => apiDownload(`/admin/analytics/report.xlsx?days=${days}`, 'laporan-diseminasi.xlsx')}
          >
            ⬇ Unduh Laporan
          </button>
        </div>
      </div>

      {!data ? (
        <p>{busy ? 'Memuat data…' : 'Tidak ada data.'}</p>
      ) : (
        <>
          <div className="kpi-grid">
            {KPIS.map((k) => (
              <div key={k.key} className="kpi-card">
                <b>{data.overview[k.key].toLocaleString('id-ID')}</b>
                <span>{k.label}</span>
              </div>
            ))}
          </div>

          <section className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Tren Pembacaan</h2>
            <div className="trend-chart">
              {data.trend.map((t) => (
                <div key={t.bucket} className="trend-col" title={`${t.bucket}: ${t.reads}`}>
                  <div
                    className="trend-bar"
                    style={{ height: `${Math.round((t.reads / maxTrend) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
              {data.trend[0]?.bucket} → {data.trend[data.trend.length - 1]?.bucket}
            </div>
          </section>

          <section className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Publikasi Paling Dibaca</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Judul</th><th>Kategori</th><th>Dibaca</th><th>Dipinjam</th></tr>
                </thead>
                <tbody>
                  {data.topDocuments.map((d, i) => (
                    <tr key={d.documentId}>
                      <td>{i + 1}</td>
                      <td>{d.slug ? <Link href={`/katalog/${d.slug}`}>{d.title}</Link> : d.title}</td>
                      <td>{d.category ?? '—'}</td>
                      <td><strong>{d.reads}</strong></td>
                      <td>{d.loans}</td>
                    </tr>
                  ))}
                  {data.topDocuments.length === 0 && (
                    <tr><td colSpan={5} style={{ color: 'var(--ink-soft)' }}>Belum ada pembacaan pada rentang ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="analytics-cols">
            <section className="card">
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Per Institusi (segmen)</h2>
              <BarList rows={data.byInstitution} max={maxInst} />
            </section>
            <section className="card">
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Per Topik</h2>
              <BarList rows={data.byCategory} max={maxCat} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function BarList({ rows, max }: { rows: { label: string; reads: number }[]; max: number }) {
  if (rows.length === 0) return <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Belum ada data.</p>;
  return (
    <div className="bar-list">
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
          <span className="bar-label" title={r.label}>{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.round((r.reads / max) * 100)}%` }} />
          </div>
          <span className="bar-value">{r.reads}</span>
        </div>
      ))}
    </div>
  );
}
