'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { api, DocumentItem, Loan } from '../../../lib/api';

const ACCESS_INFO: Record<string, string> = {
  OPEN: 'Koleksi terbuka — dapat dibaca semua anggota setelah masuk.',
  MEMBER: 'Koleksi ini dapat dibaca setelah masuk sebagai anggota.',
  LOAN: 'Koleksi ini perlu dipinjam terlebih dahulu (akses berbatas waktu).',
};

export default function DocumentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: string; text: string } | null>(null);
  const [error, setError] = useState('');

  const refreshLoan = useCallback(
    async (docId: string) => {
      if (!user) return;
      try {
        const loans = await api.get<Loan[]>('/me/loans');
        setActiveLoan(
          loans.find((l) => l.status === 'ACTIVE' && l.document.id === docId) ??
            null,
        );
      } catch {
        /* abaikan */
      }
    },
    [user],
  );

  useEffect(() => {
    api
      .get<DocumentItem>(`/documents/${slug}`)
      .then((d) => {
        setDoc(d);
        setDuration(d.loanDurations?.[0] ?? null);
        refreshLoan(d.id);
      })
      .catch((err) => setError((err as Error).message));
  }, [slug, refreshLoan]);

  async function borrow() {
    if (!doc || !duration) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.post('/loans', { documentId: doc.id, durationDays: duration });
      setNotice({ kind: 'success', text: 'Berhasil dipinjam. Selamat membaca!' });
      await refreshLoan(doc.id);
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function returnLoan() {
    if (!activeLoan) return;
    setBusy(true);
    try {
      await api.post(`/loans/${activeLoan.id}/return`);
      setActiveLoan(null);
      setNotice({ kind: 'success', text: 'Koleksi dikembalikan. Terima kasih!' });
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="container page">
        <div className="alert error">{error}</div>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="container page">
        <p>Memuat…</p>
      </div>
    );
  }

  const isStaff = user && (user.role === 'librarian' || user.role === 'superadmin');

  return (
    <div className="container page">
      <div className="detail-head">
        <div>
          <span className={`badge ${doc.accessType.toLowerCase()}`}>
            {doc.accessType === 'OPEN'
              ? 'Terbuka'
              : doc.accessType === 'MEMBER'
                ? 'Anggota'
                : 'Sewa'}
          </span>{' '}
          <span className="badge type">{doc.collectionType}</span>
        </div>
        <h1 className="page-title">{doc.title}</h1>
        <div className="page-sub">
          {doc.authors.join(', ')}
          {doc.year ? ` · ${doc.year}` : ''}
        </div>
      </div>

      {notice && <div className={`alert ${notice.kind}`}>{notice.text}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="alert info" style={{ marginBottom: 16 }}>
          {ACCESS_INFO[doc.accessType]}
          {!doc.hasDigitalCopy &&
            ' Versi digital koleksi ini belum tersedia — hubungi pustakawan.'}
        </div>

        {doc.hasDigitalCopy && !user && (
          <Link className="btn" href="/masuk">Masuk untuk membaca</Link>
        )}

        {doc.hasDigitalCopy && user && (
          <>
            {(doc.accessType !== 'LOAN' || isStaff) && (
              <Link className="btn" href={`/baca/${doc.slug}`}>📖 Baca Online</Link>
            )}

            {doc.accessType === 'LOAN' && !isStaff && (
              activeLoan ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link className="btn" href={`/baca/${doc.slug}`}>📖 Baca Online</Link>
                  <button className="btn secondary" onClick={returnLoan} disabled={busy}>
                    Kembalikan
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    Jatuh tempo:{' '}
                    {new Date(activeLoan.expiresAt).toLocaleString('id-ID')}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={duration ?? ''}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)' }}
                  >
                    {(doc.loanDurations ?? []).map((d) => (
                      <option key={d} value={d}>{d} hari</option>
                    ))}
                  </select>
                  <button className="btn" onClick={borrow} disabled={busy || !duration}>
                    {busy ? 'Memproses…' : 'Pinjam'}
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>

      {doc.abstract && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Abstrak</h2>
          <p style={{ fontSize: 14 }}>{doc.abstract}</p>
        </section>
      )}

      <section className="card">
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Detail Koleksi</h2>
        <dl className="detail-meta">
          <dt>Penulis</dt>
          <dd>{doc.authors.join('; ')}</dd>
          <dt>Penerbit</dt>
          <dd>{doc.publisher ?? '—'}</dd>
          <dt>Tahun</dt>
          <dd>{doc.year ?? '—'}</dd>
          <dt>Tipe koleksi</dt>
          <dd>{doc.collectionType}</dd>
          <dt>Bahasa</dt>
          <dd>{doc.language === 'id' ? 'Indonesia' : doc.language}</dd>
          <dt>Kategori</dt>
          <dd>{doc.category?.name ?? '—'}</dd>
          <dt>Subjek</dt>
          <dd>{doc.subjects?.length ? doc.subjects.join(', ') : '—'}</dd>
          <dt>Jumlah halaman</dt>
          <dd>{doc.pageCount ?? '—'}</dd>
          <dt>No. panggil</dt>
          <dd>{doc.callNumber ?? '—'}</dd>
          <dt>Eksemplar fisik</dt>
          <dd>
            {doc.physicalCopies > 0
              ? `${doc.physicalCopies} eksemplar di perpustakaan`
              : 'Hanya digital'}
          </dd>
        </dl>
      </section>
    </div>
  );
}
