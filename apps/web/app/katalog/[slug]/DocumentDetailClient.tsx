'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { useLang } from '../../../components/LanguageContext';
import CiteBox from '../../../components/CiteBox';
import Icon from '../../../components/Icon';
import RelatedMedia from '../../../components/RelatedMedia';
import { api, Availability, DocumentItem, Recommendation } from '../../../lib/api';
import { docAbstract, docTitle } from '../../../lib/i18n';

export default function DocumentDetailClient({
  initialDoc,
  slug,
}: {
  initialDoc?: DocumentItem;
  slug?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const { lang, t } = useLang();
  const [doc, setDoc] = useState<DocumentItem | null>(initialDoc ?? null);
  const [notFound, setNotFound] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: string; text: string } | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);

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

  // Bila SSR tak menemukan dokumen (mis. koleksi INTERNAL yang di-fetch anonim
  // di server), coba ambil di klien dengan token — hanya peneliti internal yang
  // berhasil; selain itu tampil pesan tak ditemukan.
  useEffect(() => {
    if (initialDoc || !slug || authLoading) return;
    let active = true;
    api
      .get<DocumentItem>(`/documents/${slug}`)
      .then((d) => active && setDoc(d))
      .catch(() => active && setNotFound(true));
    return () => {
      active = false;
    };
  }, [initialDoc, slug, authLoading]);

  useEffect(() => {
    if (doc?.accessType === 'LOAN') refreshAvail(doc.id);
  }, [doc, refreshAvail]);

  useEffect(() => {
    if (!doc) return;
    api
      .get<Recommendation[]>(`/documents/${doc.id}/recommendations?limit=5`)
      .then(setRecs)
      .catch(() => setRecs([]));
  }, [doc]);

  if (notFound) {
    return (
      <div className="container page">
        <div className="alert error">
          Koleksi tidak ditemukan atau Anda tidak memiliki akses.
        </div>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="container page">
        <p>{t('loading')}</p>
      </div>
    );
  }

  async function action(fn: () => Promise<unknown>, successText: string) {
    if (!doc) return;
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
        <div className="detail-badges">
          <span className={`badge ${doc.accessType.toLowerCase()}`}>
            {t(doc.accessType)}
          </span>
          <span className="badge type">{doc.collectionType}</span>
        </div>
        <h1 className="page-title">{docTitle(doc, lang)}</h1>
        <div className="page-sub">
          {doc.authors.join(', ')}
          {doc.year ? ` · ${doc.year}` : ''}
        </div>
      </div>

      {notice && <div className={`alert ${notice.kind}`}>{notice.text}</div>}

      <div className="card section-block">
        <div className="alert info">
          {isMultimedia ? t('multimediaNote') : t(`accessInfo_${doc.accessType}`)}
          {!isMultimedia && !doc.hasDigitalCopy && t('digitalUnavailable')}
        </div>

        <div className="action-row">
          {doc.hasDigitalCopy && !user && (
            <Link className="btn" href="/masuk">{t('signinToRead')}</Link>
          )}

          {doc.hasDigitalCopy && user && doc.accessType !== 'LOAN' && (
            <Link className="btn" href={`/baca/${doc.slug}`}>
              <Icon name="book" /> {t('readOnline')}
            </Link>
          )}

          {doc.hasDigitalCopy && user && doc.accessType === 'LOAN' && isStaff && (
            <Link className="btn" href={`/baca/${doc.slug}`}>
              <Icon name="book" /> {t('readOnline')}
            </Link>
          )}

          <CiteBox doc={doc} />
        </div>

        {doc.hasDigitalCopy && user && doc.accessType === 'LOAN' && !isStaff &&
          avail && (
            <div className="loan-actions">
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

      {docAbstract(doc, lang) && (
        <section className="card section-block">
          <h2 className="section-title">{t('abstract')}</h2>
          <p className="prose">{docAbstract(doc, lang)}</p>
        </section>
      )}

      <section className="card">
        <h2 className="section-title">{t('details')}</h2>
        <dl className="detail-meta">
          <dt>{t('author')}</dt>
          <dd>{doc.authors.join('; ')}</dd>
          <dt>{t('publisher')}</dt>
          <dd>{doc.publisher ?? '—'}</dd>
          <dt>{t('year')}</dt>
          <dd>{doc.year ?? '—'}</dd>
          {doc.doi && (
            <>
              <dt>DOI</dt>
              <dd>
                <a href={`https://doi.org/${doc.doi}`} target="_blank" rel="noopener noreferrer">
                  {doc.doi}
                </a>
              </dd>
            </>
          )}
          <dt>{t('type')}</dt>
          <dd>{doc.collectionType}</dd>
          <dt>{t('language')}</dt>
          <dd>{doc.language === 'id' ? 'Indonesia' : doc.language}</dd>
          <dt>{t('category')}</dt>
          <dd>{doc.category?.name ?? '—'}</dd>
          <dt>{t('subject')}</dt>
          <dd>{doc.subjects?.length ? doc.subjects.join(', ') : '—'}</dd>
          <dt>{t('pages')}</dt>
          <dd>{doc.pageCount ?? '—'}</dd>
          <dt>{t('callNumber')}</dt>
          <dd>{doc.callNumber ?? '—'}</dd>
          <dt>{t('physicalCopies')}</dt>
          <dd>
            {doc.physicalCopies > 0
              ? `${doc.physicalCopies} ${t('physicalAt')}`
              : t('digitalOnly')}
          </dd>
        </dl>
      </section>

      {recs.length > 0 && (
        <section className="card section-block-top">
          <h2 className="section-title">{t('recommendations')}</h2>
          <ul className="rec-list">
            {recs.map((r) => (
              <li key={r.slug}>
                <Link href={`/katalog/${r.slug}`}>{r.title}</Link>
                <span className="rec-meta">
                  {[r.authors.join(', '), r.year, r.category]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="rec-basis">{t(`basis_${r.basis}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
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
        <Link className="btn" href={`/baca/${slug}`}><Icon name="book" /> Baca Online</Link>
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
          Giliran Anda tiba! Klaim sebelum{' '}
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
