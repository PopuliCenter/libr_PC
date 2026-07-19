'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { AdminUser, api } from '../../../lib/api';

const ROLE_LABEL: Record<string, string> = {
  member: 'Anggota',
  librarian: 'Pustakawan',
  superadmin: 'Super Admin',
};

export default function UsersAdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  const isSuper = user?.role === 'superadmin';

  const load = useCallback(async (q: string) => {
    const res = await api.get<AdminUser[]>(
      `/admin/users${q ? `?query=${encodeURIComponent(q)}` : ''}`,
    );
    setUsers(res);
  }, []);

  useEffect(() => {
    if (isSuper) load('').catch(() => undefined);
  }, [isSuper, load]);

  async function toggleInternal(u: AdminUser) {
    setNotice('');
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${u.id}`, {
        isInternal: !u.isInternal,
      });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      setNotice(
        `${updated.email}: akses internal ${updated.isInternal ? 'diaktifkan' : 'dinonaktifkan'}.`,
      );
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  if (loading) return <div className="container page"><p>Memuat…</p></div>;
  if (!isSuper) {
    return (
      <div className="container page">
        <div className="alert error">
          Halaman ini khusus super admin. <Link href="/masuk">Masuk</Link>.
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page-title">Manajemen Pengguna</h1>
      <p className="page-sub">
        Tandai peneliti/staf internal Populi agar dapat mengakses koleksi Internal.
      </p>

      {notice && <div className="alert success">{notice}</div>}

      <form
        className="searchbar"
        onSubmit={(e) => {
          e.preventDefault();
          load(query).catch(() => undefined);
        }}
      >
        <input
          type="search"
          placeholder="Cari nama atau email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn">Cari</button>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama</th><th>Email</th><th>Peran</th><th>Institusi</th>
              <th>Internal</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                <td>{u.institution ?? '—'}</td>
                <td>
                  {u.isInternal
                    ? <span className="badge internal">Internal</span>
                    : <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                </td>
                <td>
                  <button
                    className={`btn ${u.isInternal ? 'danger' : 'secondary'}`}
                    style={{ padding: '4px 12px', fontSize: 13 }}
                    onClick={() => toggleInternal(u)}
                  >
                    {u.isInternal ? 'Cabut internal' : 'Jadikan internal'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ color: 'var(--ink-soft)' }}>Tidak ada pengguna.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
