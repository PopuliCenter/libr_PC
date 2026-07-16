'use client';

import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { AuthorizationContext, api } from '../../../lib/api';

/**
 * Halaman consent OpenID Connect. Aplikasi survei mengarahkan pengguna ke sini
 * (authorization_endpoint). Kami memastikan anggota login, menampilkan klien +
 * scope, lalu—atas persetujuan—meminta API membuat authorization code dan
 * mengarahkan balik ke redirect_uri milik klien.
 */
function AuthorizeInner() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [ctx, setCtx] = useState<AuthorizationContext | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const redirected = useRef(false);

  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const scope = params.get('scope') ?? 'openid profile email';
  const state = params.get('state') ?? '';
  const codeChallenge = params.get('code_challenge') ?? '';
  const codeChallengeMethod = params.get('code_challenge_method') ?? 'S256';
  const nonce = params.get('nonce') ?? '';
  const responseType = params.get('response_type') ?? 'code';

  // Belum login → arahkan ke /masuk dan kembali ke sini setelah berhasil.
  useEffect(() => {
    if (loading || redirected.current) return;
    if (!user) {
      redirected.current = true;
      const here = `${pathname}?${params.toString()}`;
      router.replace(`/masuk?next=${encodeURIComponent(here)}`);
    }
  }, [loading, user, pathname, params, router]);

  // Muat konteks (nama klien + scope) untuk ditampilkan.
  useEffect(() => {
    if (!user) return;
    if (!clientId || !redirectUri) {
      setError('Permintaan tidak lengkap: client_id dan redirect_uri wajib.');
      return;
    }
    if (responseType !== 'code') {
      setError('response_type tidak didukung (hanya "code").');
      return;
    }
    if (!codeChallenge) {
      setError('Permintaan wajib memakai PKCE (code_challenge).');
      return;
    }
    const qs = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
    }).toString();
    api
      .get<AuthorizationContext>(`/oauth/authorize/context?${qs}`)
      .then(setCtx)
      .catch((e) => setError((e as Error).message));
  }, [user, clientId, redirectUri, scope, responseType, codeChallenge]);

  const decide = useCallback(
    async (approve: boolean) => {
      setBusy(true);
      setError('');
      try {
        const res = await api.post<{ redirectTo: string }>('/oauth/authorize', {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope,
          state: state || undefined,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          nonce: nonce || undefined,
          approve,
        });
        window.location.href = res.redirectTo;
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
      }
    },
    [clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod, nonce],
  );

  if (loading || (!user && !error)) {
    return (
      <div className="container page">
        <p>Memuat…</p>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="card auth-card">
        <h1 className="page-title" style={{ fontSize: 20 }}>
          Izinkan akses akun Populi
        </h1>
        {error ? (
          <div className="alert error">{error}</div>
        ) : !ctx ? (
          <p className="page-sub">Memeriksa permintaan…</p>
        ) : (
          <>
            <p className="page-sub">
              <b>{ctx.client.name}</b> ingin masuk memakai akun Populi Anda
              {user ? ` (${user.email})` : ''}.
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 6px' }}>
              Aplikasi ini akan dapat:
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 18, fontSize: 14 }}>
              {ctx.scopes.map((s) => (
                <li key={s.key} style={{ marginBottom: 4 }}>
                  {s.label}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => decide(true)}
              >
                {busy ? 'Memproses…' : 'Izinkan'}
              </button>
              <button
                className="btn secondary"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => decide(false)}
              >
                Batal
              </button>
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
              Anda akan diarahkan kembali ke {redirectUri}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense>
      <AuthorizeInner />
    </Suspense>
  );
}
