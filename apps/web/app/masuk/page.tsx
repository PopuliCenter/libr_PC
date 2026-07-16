'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { API_URL, api, saveTokens } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { refresh } = useAuth();

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
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Masuk</h1>
        <p className="page-sub">Akses koleksi digital Populi Center.</p>
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
        <a
          className="btn secondary"
          style={{ width: '100%', marginTop: 10 }}
          href={`${API_URL}/auth/google`}
        >
          Masuk dengan Google
        </a>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          Belum punya akun? <Link href="/daftar">Daftar</Link>
        </p>
      </form>
    </div>
  );
}
