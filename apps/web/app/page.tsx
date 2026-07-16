'use client';

import { useCallback, useEffect, useState } from 'react';
import DocumentCard from '../components/DocumentCard';
import { api, DocumentItem, PagedResult } from '../lib/api';

const TYPES = ['buku', 'laporan', 'jurnal', 'prosiding', 'dataset', 'lainnya'];

export default function CatalogPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<DocumentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (q: string, t: string, p: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('query', q);
      if (t) params.set('type', t);
      params.set('page', String(p));
      params.set('perPage', '12');
      setResult(
        await api.get<PagedResult<DocumentItem>>(`/documents?${params}`),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('', '', 1);
  }, [load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(query, type, 1);
  }

  function goTo(p: number) {
    setPage(p);
    load(query, type, p);
  }

  return (
    <div className="container page">
      <h1 className="page-title">Katalog Koleksi</h1>
      <p className="page-sub">
        Telusuri publikasi, laporan riset, dan koleksi digital Populi Center.
      </p>

      <form className="searchbar" onSubmit={submit}>
        <input
          type="search"
          placeholder="Cari judul, penulis, atau topik…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Semua tipe</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Cari
        </button>
      </form>

      {error && <div className="alert error">{error}</div>}
      {loading && <p>Memuat…</p>}

      {result && !loading && (
        <>
          <p className="page-sub">{result.meta.total} koleksi ditemukan</p>
          <div className="doc-grid">
            {result.data.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
          {result.meta.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn secondary"
                disabled={page <= 1}
                onClick={() => goTo(page - 1)}
              >
                ‹ Sebelumnya
              </button>
              <span>
                Hal. {page} / {result.meta.totalPages}
              </span>
              <button
                className="btn secondary"
                disabled={page >= result.meta.totalPages}
                onClick={() => goTo(page + 1)}
              >
                Berikutnya ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
