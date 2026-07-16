'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { api, DocumentItem } from '../../../lib/api';

const ACCESS_INFO: Record<string, string> = {
  OPEN: 'Koleksi ini terbuka — dapat dibaca siapa saja.',
  MEMBER: 'Koleksi ini dapat dibaca setelah login sebagai anggota.',
  LOAN: 'Koleksi ini perlu dipinjam terlebih dahulu (batas waktu berlaku).',
};

export default function DocumentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<DocumentItem>(`/documents/${slug}`)
      .then(setDoc)
      .catch((err) => setError((err as Error).message));
  }, [slug]);

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

  const canReadNow =
    doc.accessType === 'OPEN' || (doc.accessType === 'MEMBER' && !!user);

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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="alert info" style={{ marginBottom: 16 }}>
          {ACCESS_INFO[doc.accessType]}
          {!doc.hasDigitalCopy &&
            ' Versi digital koleksi ini belum tersedia — hubungi pustakawan.'}
        </div>
        {doc.hasDigitalCopy ? (
          canReadNow ? (
            <button
              className="btn"
              onClick={() =>
                alert(
                  'Pembaca online (protected reader) sedang dalam pengembangan.',
                )
              }
            >
              📖 Baca Online
            </button>
          ) : (
            <a className="btn" href="/masuk">
              Masuk untuk membaca
            </a>
          )
        ) : null}
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
