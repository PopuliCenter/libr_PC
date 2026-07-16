'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { API_URL, api, saveTokens } from '../../lib/api';

/** Hanya izinkan redirect internal (path relatif) untuk mencegah open redirect. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const next = safeNext(params.get('next'));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const tokens = await api.post<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', { email, password });
      saveTokens(tokens.accessToken, tokens.refreshToken);
      await refresh();
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function googleLogin() {
    // Google kembali via /auth/callback; simpan tujuan agar bisa dilanjutkan.
    if (next !== '/') sessionStorage.setItem('postLoginNext', next);
    window.location.href = `${API_URL}/auth/google`;
  }

  return (
    <div className="container page">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Masuk</h1>
        <p className="page-sub">Akses koleksi digital Populi Center.</p>
        {next !== '/' && (
          <div className="alert info">
            Masuk untuk melanjutkan ke aplikasi yang memintanya.
          </div>
        )}
        {error && <div className="alert error">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
        <button
          type="button"
          className="btn secondary"
          style={{ width: '100%', marginTop: 10 }}
          onClick={googleLogin}
        >
          Masuk dengan Google
        </button>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          Belum punya akun? <Link href="/daftar">Daftar</Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
