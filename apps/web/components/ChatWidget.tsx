'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    'Halo! Saya asisten Perpustakaan Digital Populi Center. Tanyakan koleksi yang Anda cari, cara mendaftar, atau cara meminjam. 📚',
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const sessionId = sessionStorage.getItem('chatSessionId') ?? undefined;
      const res = await api.post<{ sessionId: string; reply: string }>(
        '/chat/messages',
        { message, sessionId },
      );
      sessionStorage.setItem('chatSessionId', res.sessionId);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Maaf, terjadi gangguan. Coba lagi sebentar lagi.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat bantuan">
          <div className="chat-head">
            <span>Bantuan Perpustakaan</span>
            <button onClick={() => setOpen(false)} aria-label="Tutup">✕</button>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="chat-msg assistant">Mengetik…</div>}
          </div>
          <div className="chat-input">
            <input
              value={input}
              placeholder="Tulis pertanyaan…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={busy}
            />
            <button onClick={send} disabled={busy}>Kirim</button>
          </div>
        </div>
      )}
      <button
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Buka chat bantuan"
      >
        💬
      </button>
    </>
  );
}
