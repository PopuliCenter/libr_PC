'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { useAuth } from '../../../components/AuthContext';
import Icon from '../../../components/Icon';
import {
  api,
  apiDownload,
  IsbnLookup,
  PhysicalItem,
  Stocktake,
  StocktakeDetail,
} from '../../../lib/api';

const CONDITIONS = ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'HILANG'];

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'pendataan' | 'opname'>('pendataan');
  const isAdmin =
    user && (user.role === 'librarian' || user.role === 'superadmin');

  if (loading) return <div className="container page"><p>Memuat…</p></div>;
  if (!isAdmin) {
    return (
      <div className="container page">
        <div className="alert error">
          Halaman ini khusus pustakawan. <Link href="/masuk">Masuk</Link>.
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">Inventarisasi Fisik</h1>
        <Link href="/admin" className="btn secondary"><Icon name="left" /> Kelola Koleksi</Link>
      </div>
      <div className="inv-tabs">
        <button className={mode === 'pendataan' ? 'active' : ''} onClick={() => setMode('pendataan')}>
          Pendataan
        </button>
        <button className={mode === 'opname' ? 'active' : ''} onClick={() => setMode('opname')}>
          Stock Opname
        </button>
      </div>
      {mode === 'pendataan' ? <Pendataan /> : <Opname />}
    </div>
  );
}

// ===================== Mode Pendataan =====================

function Pendataan() {
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState({
    isbn: '', title: '', authors: '', publisher: '', year: '',
    categoryName: '', shelfLocation: '', condition: 'BAIK', acquisitionSource: '',
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: string; text: string } | null>(null);
  const [recent, setRecent] = useState<PhysicalItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isbnRef = useRef<HTMLInputElement>(null);

  const loadRecent = useCallback(async () => {
    try {
      setRecent(await api.get<PhysicalItem[]>('/admin/physical-items'));
    } catch { /* abaikan */ }
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  async function lookup(isbn: string) {
    setForm((f) => ({ ...f, isbn }));
    setNotice(null);
    try {
      const r = await api.get<IsbnLookup>(`/admin/isbn/${encodeURIComponent(isbn)}`);
      if (r.found && r.metadata) {
        setForm((f) => ({
          ...f,
          isbn: r.isbn,
          title: r.metadata!.title,
          authors: r.metadata!.authors.join('; '),
          publisher: r.metadata!.publisher ?? '',
          year: r.metadata!.year ? String(r.metadata!.year) : '',
        }));
        setNotice({ kind: 'success', text: `Metadata ditemukan (${r.source}). Periksa lalu simpan.` });
      } else {
        setNotice({ kind: 'info', text: 'ISBN tidak ditemukan di basis data publik — isi metadata manual.' });
      }
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    }
  }

  async function save() {
    if (!form.title.trim()) {
      setNotice({ kind: 'error', text: 'Judul wajib diisi.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const r = await api.post<{ physicalItem: PhysicalItem; document: { title: string } }>(
        '/admin/physical-items',
        {
          isbn: form.isbn || undefined,
          title: form.title,
          authors: form.authors ? form.authors.split(';').map((a) => a.trim()).filter(Boolean) : undefined,
          publisher: form.publisher || undefined,
          year: form.year ? Number(form.year) : undefined,
          categoryName: form.categoryName || undefined,
          shelfLocation: form.shelfLocation || undefined,
          condition: form.condition,
          acquisitionSource: form.acquisitionSource || undefined,
        },
      );
      setNotice({ kind: 'success', text: `Tersimpan — No. Induk ${r.physicalItem.accessionNo}` });
      setForm({ isbn: '', title: '', authors: '', publisher: '', year: '', categoryName: '', shelfLocation: form.shelfLocation, condition: 'BAIK', acquisitionSource: form.acquisitionSource });
      isbnRef.current?.focus();
      await loadRecent();
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function toggleSel(acc: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(acc) ? n.delete(acc) : n.add(acc);
      return n;
    });
  }

  async function printLabels() {
    const accessionNos = [...selected];
    if (accessionNos.length === 0) return;
    const tokens = { accessionNos };
    // apiDownload hanya GET; label butuh POST — pakai fetch manual via api.post tak cocok (blob).
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/admin/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(tokens),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'label-qr.pdf'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onDetect={(code) => { setScanning(false); lookup(code); }}
        />
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Data Eksemplar Baru</h2>
        {notice && <div className={`alert ${notice.kind}`}>{notice.text}</div>}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
          <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label>ISBN (scan / ketik, Enter untuk cari)</label>
            <input
              ref={isbnRef}
              value={form.isbn}
              onChange={(e) => setForm({ ...form, isbn: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && form.isbn.trim()) lookup(form.isbn.trim()); }}
              placeholder="mis. 9780140328721"
            />
          </div>
          <button className="btn secondary" onClick={() => setScanning(true)}><Icon name="camera" /> Scan Kamera</button>
          <button className="btn secondary" onClick={() => form.isbn.trim() && lookup(form.isbn.trim())}>Cari</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="field"><label>Judul *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Tahun</label>
            <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Penulis (pisah ;)</label>
            <input value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} /></div>
          <div className="field"><label>Penerbit</label>
            <input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div className="field"><label>Kategori</label>
            <input value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} /></div>
          <div className="field"><label>Lokasi Rak</label>
            <input value={form.shelfLocation} onChange={(e) => setForm({ ...form, shelfLocation: e.target.value })} /></div>
          <div className="field"><label>Kondisi</label>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div className="field"><label>Sumber</label>
            <input value={form.acquisitionSource} onChange={(e) => setForm({ ...form, acquisitionSource: e.target.value })} placeholder="beli/hibah" /></div>
        </div>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan Eksemplar'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 16 }}>Eksemplar Terbaru</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary" onClick={printLabels} disabled={selected.size === 0}>
              <Icon name="tag" /> Cetak Label QR ({selected.size})
            </button>
            <button className="btn secondary" onClick={() => apiDownload('/admin/inventory/report', 'rekap-inventaris.xlsx')}>
              <Icon name="download" /> Rekap
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr><th></th><th>No. Induk</th><th>Judul</th><th>Lokasi</th><th>Kondisi</th></tr>
            </thead>
            <tbody>
              {recent.slice(0, 30).map((it) => (
                <tr key={it.id}>
                  <td><input type="checkbox" checked={selected.has(it.accessionNo)} onChange={() => toggleSel(it.accessionNo)} /></td>
                  <td>{it.accessionNo}</td>
                  <td>{it.document?.title ?? '—'}</td>
                  <td>{it.shelfLocation ?? '—'}</td>
                  <td>{it.condition}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--ink-soft)' }}>Belum ada eksemplar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ===================== Mode Stock Opname =====================

function Opname() {
  const [scanning, setScanning] = useState(false);
  const [name, setName] = useState('');
  const [detail, setDetail] = useState<StocktakeDetail | null>(null);
  const [barcode, setBarcode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const active = detail?.stocktake.status === 'OPEN';

  async function start() {
    const st = await api.post<Stocktake>('/admin/stocktakes', { name });
    setDetail(await api.get<StocktakeDetail>(`/admin/stocktakes/${st.id}`));
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }

  async function scan(code: string) {
    if (!detail || !code.trim()) return;
    setBarcode('');
    try {
      const r = await api.post<{ recognized: boolean; title: string | null; accessionNo: string | null }>(
        `/admin/stocktakes/${detail.stocktake.id}/scan`,
        {
          barcode: code.trim(),
          clientScanId: crypto.randomUUID(),
        },
      );
      setNotice(r.recognized ? `${r.accessionNo} — ${r.title}` : `Barcode tak dikenal: ${code}`);
      setDetail(await api.get<StocktakeDetail>(`/admin/stocktakes/${detail.stocktake.id}`));
    } catch (err) {
      setNotice((err as Error).message);
    }
    barcodeRef.current?.focus();
  }

  async function close() {
    if (!detail) return;
    await api.post(`/admin/stocktakes/${detail.stocktake.id}/close`);
    setDetail(await api.get<StocktakeDetail>(`/admin/stocktakes/${detail.stocktake.id}`));
  }

  if (!detail) {
    return (
      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Mulai Sesi Opname</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 220, padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10 }}
            placeholder="Nama sesi (mis. Opname Rak A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" onClick={start}>Mulai</button>
        </div>
        <p className="page-sub" style={{ marginTop: 12 }}>
          Susuri rak, scan tiap buku (kamera / scanner USB / ketik nomor induk).
          Di akhir sesi, sistem menghitung buku hilang dan salah lokasi.
        </p>
      </div>
    );
  }

  const s = detail.stocktake.summary;
  return (
    <>
      {scanning && (
        <BarcodeScanner onClose={() => setScanning(false)} onDetect={(c) => { setScanning(false); scan(c); }} />
      )}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 16 }}>
            {detail.stocktake.name}{' '}
            <span className={`badge ${active ? 'open' : 'type'}`}>{active ? 'Berjalan' : 'Ditutup'}</span>
          </h2>
          {active ? (
            <button className="btn danger" onClick={close}>Tutup Sesi</button>
          ) : (
            <button className="btn secondary" onClick={() => apiDownload(`/admin/stocktakes/${detail.stocktake.id}/report`, 'laporan-opname.xlsx')}>
              <Icon name="download" /> Unduh Laporan
            </button>
          )}
        </div>

        <div className="opname-stat">
          <div className="stat"><b>{detail.live.totalItems}</b><span>Total</span></div>
          <div className="stat"><b style={{ color: 'var(--ok)' }}>{detail.live.found}</b><span>Ditemukan</span></div>
          <div className="stat"><b style={{ color: 'var(--warn)' }}>{detail.live.remaining}</b><span>Belum ter-scan</span></div>
          <div className="stat"><b style={{ color: 'var(--danger)' }}>{detail.live.unknownScans}</b><span>Tak dikenal</span></div>
        </div>

        {active && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              ref={barcodeRef}
              style={{ flex: 1, minWidth: 220, padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10 }}
              placeholder="Scan / ketik nomor induk atau ISBN, lalu Enter"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') scan(barcode); }}
            />
            <button className="btn secondary" onClick={() => setScanning(true)}><Icon name="camera" /> Kamera</button>
          </div>
        )}
        {notice && <div className="alert info" style={{ marginTop: 4 }}>{notice}</div>}

        {!active && s && (
          <div className="alert success" style={{ marginTop: 12 }}>
            Opname selesai — {s.found} ditemukan, {s.missing} hilang/belum ter-scan,
            {' '}{s.misplaced} salah lokasi, {s.unknownScans} scan tak dikenal.
          </div>
        )}

        <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Scan terakhir</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>Barcode</th><th>Status</th></tr></thead>
            <tbody>
              {detail.recentScans.map((sc) => (
                <tr key={sc.id}>
                  <td>{sc.barcode}</td>
                  <td>{sc.physicalItemId ? <span className="badge open">dikenali</span> : <span className="badge loan">tak dikenal</span>}</td>
                </tr>
              ))}
              {detail.recentScans.length === 0 && (
                <tr><td colSpan={2} style={{ color: 'var(--ink-soft)' }}>Belum ada scan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
