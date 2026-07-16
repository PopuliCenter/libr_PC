'use client';

import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  member: 'Anggota',
  librarian: 'Pustakawan',
  superadmin: 'Super Admin',
};

export default function AccountPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container page">
        <p>Memuat…</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container page">
        <div className="alert info">
          Silakan <Link href="/masuk">masuk</Link> untuk melihat akun Anda.
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page-title">Akun Saya</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        <dl className="detail-meta">
          <dt>Nama</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Peran</dt>
          <dd>{ROLE_LABEL[user.role] ?? user.role}</dd>
          <dt>Institusi</dt>
          <dd>{user.institution ?? '—'}</dd>
          <dt>Status</dt>
          <dd>{user.status === 'active' ? 'Aktif' : user.status}</dd>
        </dl>
      </div>
      <p className="page-sub" style={{ marginTop: 16 }}>
        Riwayat baca dan peminjaman akan tampil di sini setelah modul sewa
        digital tersedia.
      </p>
    </div>
  );
}
