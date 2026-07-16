'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import InterestPicker from '../../components/InterestPicker';
import { api, Hold, Loan } from '../../lib/api';

const ROLE_LABEL: Record<string, string> = {
  member: 'Anggota',
  librarian: 'Pustakawan',
  superadmin: 'Super Admin',
};

const LOAN_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif',
  RETURNED: 'Dikembalikan',
  EXPIRED: 'Kedaluwarsa',
};

const HOLD_LABEL: Record<string, string> = {
  WAITING: 'Mengantre',
  OFFERED: 'Giliran tiba',
  CLAIMED: 'Sudah diklaim',
  CANCELLED: 'Dibatalkan',
  EXPIRED: 'Terlewat',
};

export default function AccountPage() {
  const { user, loading, refresh } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);

  // Preferensi diseminasi (minat/consent/telepon).
  const [interests, setInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState('');
  const [savingPref, setSavingPref] = useState(false);
  const [prefNotice, setPrefNotice] = useState<{ kind: string; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      api.get<Loan[]>('/me/loans').then(setLoans).catch(() => undefined);
      api.get<Hold[]>('/me/holds').then(setHolds).catch(() => undefined);
      setInterests(user.interests ?? []);
      setConsent(user.newsletterConsent ?? false);
      setPhone(user.phone ?? '');
    }
  }, [user]);

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSavingPref(true);
    setPrefNotice(null);
    try {
      await api.patch('/auth/me/preferences', {
        interests,
        newsletterConsent: consent,
        phone,
      });
      await refresh();
      setPrefNotice({ kind: 'success', text: 'Preferensi tersimpan.' });
    } catch (err) {
      setPrefNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setSavingPref(false);
    }
  }

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

      <h2 style={{ fontSize: 18, margin: '28px 0 12px' }}>Minat & Notifikasi</h2>
      <form className="card" style={{ maxWidth: 620 }} onSubmit={savePreferences}>
        {prefNotice && (
          <div className={`alert ${prefNotice.kind}`}>{prefNotice.text}</div>
        )}
        <InterestPicker
          interests={interests}
          onInterests={setInterests}
          consent={consent}
          onConsent={setConsent}
        />
        <div className="field" style={{ marginTop: 16 }}>
          <label>Nomor WhatsApp (opsional)</label>
          <input
            type="tel"
            placeholder="mis. 0812xxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 5 }}>
            Untuk pengingat jatuh tempo sewa, giliran antrian, dan kabar terbitan baru via WhatsApp.
          </p>
        </div>
        <button className="btn" disabled={savingPref}>
          {savingPref ? 'Menyimpan…' : 'Simpan Preferensi'}
        </button>
      </form>

      <h2 style={{ fontSize: 18, margin: '28px 0 12px' }}>Peminjaman Saya</h2>
      {loans.length === 0 ? (
        <p className="page-sub">Belum ada peminjaman.</p>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Koleksi</th>
                <th>Status</th>
                <th>Jatuh tempo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <Link href={`/katalog/${loan.document.slug}`}>
                      {loan.document.title}
                    </Link>
                  </td>
                  <td>{LOAN_LABEL[loan.status] ?? loan.status}</td>
                  <td>{new Date(loan.expiresAt).toLocaleString('id-ID')}</td>
                  <td>
                    {loan.status === 'ACTIVE' && (
                      <Link className="btn" style={{ padding: '5px 12px', fontSize: 13 }}
                        href={`/baca/${loan.document.slug}`}>
                        Baca
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {holds.filter((h) => h.status === 'WAITING' || h.status === 'OFFERED')
        .length > 0 && (
        <>
          <h2 style={{ fontSize: 18, margin: '28px 0 12px' }}>Antrian Saya</h2>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Koleksi</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holds
                  .filter((h) => h.status === 'WAITING' || h.status === 'OFFERED')
                  .map((hold) => (
                    <tr key={hold.id}>
                      <td>
                        <Link href={`/katalog/${hold.document.slug}`}>
                          {hold.document.title}
                        </Link>
                      </td>
                      <td>{HOLD_LABEL[hold.status] ?? hold.status}</td>
                      <td>
                        <Link
                          className="btn"
                          style={{ padding: '5px 12px', fontSize: 13 }}
                          href={`/katalog/${hold.document.slug}`}
                        >
                          {hold.status === 'OFFERED' ? 'Klaim' : 'Lihat'}
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
