'use client';

import { useCallback, useEffect, useState } from 'react';
import { Annotation, api } from '../lib/api';
import Icon from './Icon';

/**
 * Panel catatan pribadi di protected reader (PRD P5). Catatan tersimpan per akun
 * di server — bukan di berkas — sehingga proteksi koleksi tetap utuh.
 */
export default function ReaderNotes({
  documentId,
  page,
  onJump,
  onClose,
}: {
  documentId: string;
  page: number;
  onJump: (n: number) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setNotes(
        await api.get<Annotation[]>(`/me/annotations?documentId=${documentId}`),
      );
    } catch {
      /* abaikan */
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/me/annotations', { documentId, pageNo: page, note: draft });
      setDraft('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editingText.trim()) return;
    try {
      await api.patch(`/me/annotations/${id}`, { note: editingText });
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/me/annotations/${id}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <aside className="reader-notes">
      <div className="reader-notes-head">
        <span>Catatan Saya ({notes.length})</span>
        <button onClick={onClose} aria-label="Tutup catatan"><Icon name="close" /></button>
      </div>

      <div className="reader-notes-add">
        <label>Catatan untuk halaman {page}</label>
        <textarea
          rows={3}
          value={draft}
          placeholder="Tulis catatan pribadi…"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn" disabled={busy || !draft.trim()} onClick={add}>
          {busy ? 'Menyimpan…' : 'Tambah catatan'}
        </button>
        {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
      </div>

      <div className="reader-notes-list">
        {notes.length === 0 && (
          <p className="reader-notes-empty">Belum ada catatan.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="reader-note">
            <button className="reader-note-page" onClick={() => onJump(n.pageNo)}>
              Hal. {n.pageNo}
            </button>
            {editingId === n.id ? (
              <>
                <textarea
                  rows={3}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                />
                <div className="reader-note-actions">
                  <button onClick={() => saveEdit(n.id)}>Simpan</button>
                  <button onClick={() => setEditingId(null)}>Batal</button>
                </div>
              </>
            ) : (
              <>
                <p className="reader-note-text">{n.note}</p>
                <div className="reader-note-actions">
                  <button
                    onClick={() => {
                      setEditingId(n.id);
                      setEditingText(n.note);
                    }}
                  >
                    Edit
                  </button>
                  <button onClick={() => remove(n.id)}>Hapus</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
