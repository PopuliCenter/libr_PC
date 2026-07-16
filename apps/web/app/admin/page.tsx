'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { api, DocumentItem, PagedResult } from '../../lib/api';

const EMPTY_FORM = {
  title: '',
  authors: '',
  year: '',
  collectionType: 'laporan',
  accessType: 'MEMBER',
  abstract: '',
  status: 'PUBLISHED',
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: string; text: string } | null>(
    null,
  );

  const isAdmin =
    user && (user.role === 'librarian' || user.role === 'superadmin');

  const load = useCallback(async () => {
    const res = await api.get<PagedResult<DocumentItem>>(
      '/admin/documents?perPage=50',
    );
    setDocs(res.data);
  }, []);

  useEffect(() => {
    if (isAdmin) load().catch(() => undefined);
  }, [isAdmin, load]);

  if (loading) {
    return (
      <div className="container page">
        <p>Memuat…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="container page">
        <div className="alert error">
          Halaman ini khusus pustakawan. <Link href="/masuk">Masuk</Link>{' '}
          dengan akun pustakawan/admin.
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api.post('/admin/documents', {
        title: form.title,
        authors: form.authors
          .split(';')
          .map((a) => a.trim())
          .filter(Boolean),
        year: form.year ? Number(form.year) : undefined,
        collectionType: form.collectionType,
        accessType: form.accessType,
        abstract: form.abstract || undefined,
        status: form.status,
      });
      setForm(EMPTY_FORM);
      setNotice({ kind: 'success', text: 'Koleksi berhasil ditambahkan.' });
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Hapus koleksi "${title}"?`)) return;
    try {
      await api.delete(`/admin/documents/${id}`);
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    }
  }

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Manajemen Koleksi</h1>
          <p className="page-sub">Tambah dan kelola koleksi perpustakaan.</p>
        </div>
        <Link href="/admin/impor" className="btn">📦 Impor Massal</Link>
      </div>

      {notice && <div className={`alert ${notice.kind}`}>{notice.text}</div>}

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>Tambah Koleksi</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>Judul</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Penulis (pisahkan dengan “;” bila lebih dari satu)</label>
            <input
              required
              value={form.authors}
              onChange={(e) => setForm({ ...form, authors: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Tahun</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Tipe</label>
              <select
                value={form.collectionType}
                onChange={(e) =>
                  setForm({ ...form, collectionType: e.target.value })
                }
              >
                {['buku', 'laporan', 'jurnal', 'prosiding', 'dataset', 'lainnya'].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </div>
            <div className="field">
              <label>Akses</label>
              <select
                value={form.accessType}
                onChange={(e) =>
                  setForm({ ...form, accessType: e.target.value })
                }
              >
                <option value="OPEN">Terbuka</option>
                <option value="MEMBER">Anggota</option>
                <option value="LOAN">Sewa</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PUBLISHED">Publish</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Abstrak</label>
            <textarea
              rows={3}
              value={form.abstract}
              onChange={(e) => setForm({ ...form, abstract: e.target.value })}
            />
          </div>
          <button className="btn" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan Koleksi'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 14 }}>
          Semua Koleksi ({docs.length})
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Tahun</th>
                <th>Tipe</th>
                <th>Akses</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/katalog/${d.slug}`}>{d.title}</Link>
                  </td>
                  <td>{d.year ?? '—'}</td>
                  <td>{d.collectionType}</td>
                  <td>{d.accessType}</td>
                  <td>{d.status}</td>
                  <td>
                    <button
                      className="btn danger"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => remove(d.id, d.title)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
