'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    institution: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/register', {
        ...form,
        institution: form.institution || undefined,
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="container page">
        <div className="card auth-card">
          <div className="alert success">
            Registrasi berhasil! Kami telah mengirim tautan verifikasi ke{' '}
            <strong>{form.email}</strong>. Klik tautan tersebut untuk
            mengaktifkan akun Anda.
          </div>
          <Link href="/masuk">← Ke halaman masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="page-title">Daftar Anggota</h1>
        <p className="page-sub">Gratis — cukup verifikasi email.</p>
        {error && <div className="alert error">{error}</div>}
        <div className="field">
          <label>Nama lengkap</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Password (min. 8 karakter)</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Institusi (opsional)</label>
          <input
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          />
        </div>
        <button className="btn" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Memproses…' : 'Daftar'}
        </button>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          Sudah punya akun? <Link href="/masuk">Masuk</Link>
        </p>
      </form>
    </div>
  );
}
