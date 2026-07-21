'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import ReaderNotes from '../../../components/ReaderNotes';
import Icon from '../../../components/Icon';
import {
  api,
  apiBlob,
  DocumentItem,
  ReaderSession,
} from '../../../lib/api';

/**
 * Protected reader: halaman disajikan sebagai gambar ber-watermark dari server.
 * Copy/print/download dinonaktifkan (deterrent — lihat SDD 2.3).
 */
export default function ReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading } = useAuth();

  const [session, setSession] = useState<ReaderSession | null>(null);
  const [page, setPage] = useState(1);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const cache = useRef(new Map<number, string>());

  // Buka sesi baca setelah auth siap.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setError('login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const doc = await api.get<DocumentItem>(`/documents/${slug}`);
        const s = await api.post<ReaderSession>('/reader/sessions', {
          documentId: doc.id,
        });
        if (!cancelled) {
          setSession(s);
          setPage(s.lastPage || 1);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user, loading]);

  const loadPage = useCallback(
    async (s: ReaderSession, n: number): Promise<string> => {
      const cached = cache.current.get(n);
      if (cached) return cached;
      const blob = await apiBlob(`/reader/sessions/${s.sessionId}/pages/${n}`);
      const url = URL.createObjectURL(blob);
      cache.current.set(n, url);
      return url;
    },
    [],
  );

  // Muat halaman aktif + prefetch halaman berikutnya.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setBusy(true);
    loadPage(session, page)
      .then((url) => {
        if (cancelled) return;
        setImgUrl(url);
        setError('');
        if (!session.pageCount || page < session.pageCount) {
          loadPage(session, page + 1).catch(() => undefined);
        }
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [session, page, loadPage]);

  // Navigasi keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function go(delta: number) {
    setPage((p) => {
      const next = p + delta;
      if (next < 1) return p;
      if (session?.pageCount && next > session.pageCount) return p;
      return next;
    });
  }

  if (error === 'login') {
    return (
      <div className="container page">
        <div className="alert info">
          Silakan <Link href="/masuk">masuk</Link> terlebih dahulu untuk membaca
          koleksi.
        </div>
      </div>
    );
  }

  return (
    <div
      className="reader-page"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="reader-bar">
        <Link href={`/katalog/${slug}`} className="reader-close">
          <Icon name="close" /> Tutup
        </Link>
        <span className="reader-title">{session?.title ?? 'Memuat…'}</span>
        {session && (
          <button
            className="reader-notes-toggle"
            onClick={() => setShowNotes((s) => !s)}
          >
            <Icon name="note" /> Catatan
          </button>
        )}
        <div className="reader-nav">
          <button onClick={() => go(-1)} disabled={page <= 1} aria-label="Halaman sebelumnya"><Icon name="left" /></button>
          <span>
            {page}
            {session?.pageCount ? ` / ${session.pageCount}` : ''}
          </span>
          <button
            onClick={() => go(1)}
            disabled={!!session?.pageCount && page >= session.pageCount}
          >
            <Icon name="right" />
          </button>
        </div>
      </div>

      <div className="reader-body">
        <div className="reader-stage">
          {error && error !== 'login' && (
            <div className="alert error" style={{ margin: 24 }}>{error}</div>
          )}
          {!error && imgUrl && (
            <img
              src={imgUrl}
              alt={`Halaman ${page}`}
              className="reader-img"
              draggable={false}
            />
          )}
          {busy && <div className="reader-loading">Memuat halaman…</div>}
        </div>

        {showNotes && session && (
          <ReaderNotes
            documentId={session.documentId}
            page={page}
            onJump={(n) => setPage(n)}
            onClose={() => setShowNotes(false)}
          />
        )}
      </div>
    </div>
  );
}
