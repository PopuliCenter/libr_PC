'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import {
  api,
  apiDownload,
  apiUpload,
  ImportBatch,
  ImportItem,
} from '../../../lib/api';

const STATUS_CLASS: Record<string, string> = {
  VALID: 'open',
  CREATED: 'open',
  WARNING: 'loan',
  SKIPPED: 'loan',
  ERROR: 'danger',
  FAILED: 'danger',
  PROCESSING: 'member',
};

export default function ImportPage() {
  const { user, loading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin =
    user && (user.role === 'librarian' || user.role === 'superadmin');

  const poll = useCallback((batchId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get<{ batch: ImportBatch; items: ImportItem[] }>(
          `/admin/import/batches/${batchId}`,
        );
        setBatch(r.batch);
        setItems(r.items);
        if (r.batch.status === 'DONE' || r.batch.status === 'FAILED') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* abaikan */
      }
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  if (loading) {
    return <div className="container page"><p>Memuat…</p></div>;
  }
  if (!isAdmin) {
    return (
      <div className="container page">
        <div className="alert error">
          Halaman ini khusus pustakawan. <Link href="/masuk">Masuk</Link>.
        </div>
      </div>
    );
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError('');
    setBatch(null);
    setItems([]);
    try {
      const r = await apiUpload<{ batch: ImportBatch; items: ImportItem[] }>(
        '/admin/import/batches',
        file,
      );
      setBatch(r.batch);
      setItems(r.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!batch) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/admin/import/batches/${batch.id}/commit`, {
        autoPublish,
      });
      poll(batch.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const t = batch?.totals;
  const importable = items.filter(
    (i) => i.status === 'VALID' || i.status === 'WARNING',
  ).length;
  const isReady = batch?.status === 'READY';
  const isRunning = batch?.status === 'PROCESSING';
  const isDone = batch?.status === 'DONE';

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Impor Massal Koleksi</h1>
          <p className="page-sub">
            Unggah satu ZIP berisi template terisi (.xlsx) + berkas PDF.
          </p>
        </div>
        <Link href="/admin" className="btn secondary">← Kelola Koleksi</Link>
      </div>

      {error && <div className="alert error">{error}</div>}

      {/* Langkah 1: template + unggah */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>1. Siapkan & Unggah</h2>
        <button
          className="btn secondary"
          onClick={() =>
            apiDownload('/admin/import/template', 'template-impor-populi.xlsx')
          }
        >
          ⬇ Unduh Template Excel
        </button>
        <p className="page-sub" style={{ margin: '14px 0 8px' }}>
          Isi sheet “Koleksi”, kumpulkan dengan PDF ke dalam satu ZIP, lalu
          unggah di sini:
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button className="btn" onClick={upload} disabled={!file || busy}>
            {busy && !batch ? 'Memvalidasi…' : 'Unggah & Validasi'}
          </button>
        </div>
      </div>

      {/* Langkah 2: pratinjau validasi */}
      {batch && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>
            2. Pratinjau Validasi
          </h2>
          {t && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className="badge type">Total: {t.total}</span>
              <span className="badge open">Valid: {t.valid}</span>
              <span className="badge loan">Peringatan: {t.warning}</span>
              <span className="badge" style={{ background: '#fbeae9', color: 'var(--danger)' }}>Error: {t.error}</span>
              {isDone && (
                <>
                  <span className="badge open">Dibuat: {t.created}</span>
                  <span className="badge loan">Dilewati: {t.skipped}</span>
                  {t.failedItems > 0 && (
                    <span className="badge" style={{ background: '#fbeae9', color: 'var(--danger)' }}>Gagal: {t.failedItems}</span>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Baris</th>
                  <th>Judul</th>
                  <th>Akses</th>
                  <th>Status</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.rowNo}</td>
                    <td>
                      {it.documentId ? (
                        <Link href={`/admin`}>{it.payload.judul || '—'}</Link>
                      ) : (
                        it.payload.judul || <em style={{ color: 'var(--ink-soft)' }}>(kosong)</em>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {it.payload.namaFile}
                      </div>
                    </td>
                    <td>{it.payload.tipeAkses}</td>
                    <td>
                      <span
                        className={`badge ${STATUS_CLASS[it.status] ?? 'type'}`}
                        style={
                          STATUS_CLASS[it.status] === 'danger'
                            ? { background: '#fbeae9', color: 'var(--danger)' }
                            : undefined
                        }
                      >
                        {it.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      {it.messages.join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Langkah 3: konfirmasi impor */}
          {isReady && (
            <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                />
                Langsung publikasikan (tanpa review draft)
              </label>
              <button className="btn" onClick={commit} disabled={busy || importable === 0}>
                Impor {importable} baris valid
              </button>
              {importable === 0 && (
                <span style={{ fontSize: 13, color: 'var(--danger)' }}>
                  Tidak ada baris valid untuk diimpor — perbaiki dahulu.
                </span>
              )}
            </div>
          )}

          {isRunning && (
            <div className="alert info" style={{ marginTop: 16 }}>
              Sedang memproses di latar belakang… halaman ini memperbarui otomatis.
            </div>
          )}

          {isDone && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="alert success" style={{ flex: 1, minWidth: 240, margin: 0 }}>
                Impor selesai — {t?.created} koleksi dibuat
                {t?.skipped ? `, ${t.skipped} dilewati` : ''}
                {batch.autoPublish ? ' dan dipublikasikan.' : ' sebagai draft (perlu dipublikasikan).'}
              </div>
              <button
                className="btn secondary"
                onClick={() =>
                  apiDownload(
                    `/admin/import/batches/${batch.id}/report`,
                    'laporan-impor.xlsx',
                  )
                }
              >
                ⬇ Unduh Laporan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
