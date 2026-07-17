'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import CiteBox from '../../../components/CiteBox';
import RelatedMedia from '../../../components/RelatedMedia';
import { api, Availability, DocumentItem } from '../../../lib/api';

const ACCESS_INFO: Record<string, string> = {
  OPEN: 'Koleksi terbuka — dapat dibaca semua anggota setelah masuk.',
  MEMBER: 'Koleksi ini dapat dibaca setelah masuk sebagai anggota.',
  LOAN: 'Koleksi ini perlu dipinjam terlebih dahulu (akses berbatas waktu).',
};

export default function DocumentDetailClient({
  initialDoc,
}: {
  initialDoc: DocumentItem;
}) {
  const { user } = useAuth();
  const [doc] = useState<DocumentItem>(initialDoc);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: string; text: string } | null>(null);

  const refreshAvail = useCallback(
    async (docId: string) => {
      if (!user) return;
      try {
        const a = await api.get<Availability>(`/documents/${docId}/availability`);
        setAvail(a);
        setDuration((d) => d ?? a.loanDurations?.[0] ?? null);
      } catch {
        /* abaikan */
      }
    },
    [user],
  );

  useEffect(() => {
    if (doc.accessType === 'LOAN') refreshAvail(doc.id);
  }, [doc, refreshAvail]);

  async function action(fn: () => Promise<unknown>, successText: string) {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ kind: 'success', text: successText });
      await refreshAvail(doc.id);
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const isStaff = user && (user.role === 'librarian' || user.role === 'superadmin');
  const isMultimedia =
    doc.collectionType === 'video' || doc.collectionType === 'audio';

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
          {isMultimedia
            ? 'Koleksi multimedia — tonton/dengarkan pada pemutar di bawah.'
            : ACCESS_INFO[doc.accessType]}
          {!isMultimedia && !doc.hasDigitalCopy &&
            ' Versi digital koleksi ini belum tersedia — hubungi pustakawan.'}
        </div>

        <div
          style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {doc.hasDigitalCopy && !user && (
            <Link className="btn" href="/masuk">Masuk untuk membaca</Link>
          )}

          {doc.hasDigitalCopy && user && doc.accessType !== 'LOAN' && (
            <Link className="btn" href={`/baca/${doc.slug}`}>📖 Baca Online</Link>
          )}

          {doc.hasDigitalCopy && user && doc.accessType === 'LOAN' && isStaff && (
            <Link className="btn" href={`/baca/${doc.slug}`}>📖 Baca Online (staf)</Link>
          )}

          <CiteBox doc={doc} />
        </div>

        {doc.hasDigitalCopy && user && doc.accessType === 'LOAN' && !isStaff &&
          avail && (
            <div style={{ marginTop: 14 }}>
              <LoanActions
                avail={avail}
                slug={doc.slug}
                duration={duration}
                setDuration={setDuration}
                busy={busy}
                onBorrow={(d) =>
                  action(
                    () => api.post('/loans', { documentId: doc.id, durationDays: d }),
                    'Berhasil dipinjam. Selamat membaca!',
                  )
                }
                onReturn={(loanId) =>
                  action(
                    () => api.post(`/loans/${loanId}/return`),
                    'Koleksi dikembalikan. Terima kasih!',
                  )
                }
                onJoin={() =>
                  action(
                    () => api.post('/holds', { documentId: doc.id }),
                    'Anda masuk antrian. Kami kabari via email saat giliran tiba.',
                  )
                }
                onClaim={(holdId, d) =>
                  action(
                    () => api.post(`/holds/${holdId}/claim`, { durationDays: d }),
                    'Berhasil diklaim. Selamat membaca!',
                  )
                }
                onCancelHold={(holdId) =>
                  action(
                    () => api.post(`/holds/${holdId}/cancel`),
                    'Antrian dibatalkan.',
                  )
                }
              />
            </div>
          )}
      </div>

      <RelatedMedia links={doc.relatedLinks} />

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

function LoanActions({
  avail,
  slug,
  duration,
  setDuration,
  busy,
  onBorrow,
  onReturn,
  onJoin,
  onClaim,
  onCancelHold,
}: {
  avail: Availability;
  slug: string;
  duration: number | null;
  setDuration: (d: number) => void;
  busy: boolean;
  onBorrow: (d: number) => void;
  onReturn: (loanId: string) => void;
  onJoin: () => void;
  onClaim: (holdId: string, d: number) => void;
  onCancelHold: (holdId: string) => void;
}) {
  const row: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  };
  const durationSelect = (
    <select
      value={duration ?? ''}
      onChange={(e) => setDuration(Number(e.target.value))}
      style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--line)' }}
    >
      {avail.loanDurations.map((d) => (
        <option key={d} value={d}>{d} hari</option>
      ))}
    </select>
  );

  // Sedang meminjam.
  if (avail.myLoan) {
    return (
      <div style={row}>
        <Link className="btn" href={`/baca/${slug}`}>📖 Baca Online</Link>
        <button className="btn secondary" onClick={() => onReturn(avail.myLoan!.id)} disabled={busy}>
          Kembalikan
        </button>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Jatuh tempo: {new Date(avail.myLoan.expiresAt).toLocaleString('id-ID')}
        </span>
      </div>
    );
  }

  // Giliran tiba — tawaran menunggu diklaim.
  if (avail.myHold?.status === 'OFFERED') {
    return (
      <div>
        <div className="alert success" style={{ marginBottom: 12 }}>
          🎉 Giliran Anda tiba! Klaim sebelum{' '}
          {avail.myHold.offerExpiresAt &&
            new Date(avail.myHold.offerExpiresAt).toLocaleString('id-ID')}
          , setelah itu giliran berpindah.
        </div>
        <div style={row}>
          {durationSelect}
          <button className="btn" onClick={() => onClaim(avail.myHold!.id, duration!)} disabled={busy || !duration}>
            {busy ? 'Memproses…' : 'Klaim & Pinjam'}
          </button>
          <button className="btn secondary" onClick={() => onCancelHold(avail.myHold!.id)} disabled={busy}>
            Lewati
          </button>
        </div>
      </div>
    );
  }

  // Dalam antrian.
  if (avail.myHold?.status === 'WAITING') {
    return (
      <div style={row}>
        <span className="badge loan">Dalam antrian</span>
        <span style={{ fontSize: 14 }}>
          Posisi Anda: <strong>{avail.myHold.position}</strong> dari{' '}
          {avail.queueLength} pengantre
        </span>
        <button className="btn secondary" onClick={() => onCancelHold(avail.myHold!.id)} disabled={busy}>
          Batalkan antrian
        </button>
      </div>
    );
  }

  // Tersedia untuk dipinjam.
  if (avail.available) {
    return (
      <div style={row}>
        {durationSelect}
        <button className="btn" onClick={() => onBorrow(duration!)} disabled={busy || !duration}>
          {busy ? 'Memproses…' : 'Pinjam'}
        </button>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {avail.licenseCount - avail.activeLoans} dari {avail.licenseCount} kopi tersedia
        </span>
      </div>
    );
  }

  // Penuh — tawarkan antrian.
  return (
    <div style={row}>
      <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
        Semua {avail.licenseCount} kopi sedang dipinjam
        {avail.queueLength > 0 ? ` · ${avail.queueLength} orang mengantre` : ''}.
      </span>
      <button className="btn" onClick={onJoin} disabled={busy}>
        {busy ? 'Memproses…' : 'Masuk Antrian'}
      </button>
    </div>
  );
}
