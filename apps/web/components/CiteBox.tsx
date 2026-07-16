'use client';

import { useMemo, useState } from 'react';
import { buildCitations, CitableDoc } from '../lib/citations';

/**
 * Tombol "Kutip" pada halaman detail koleksi: menampilkan sitasi siap salin
 * dalam gaya APA, Chicago, dan BibTeX (PRD I9).
 */
export default function CiteBox({ doc }: { doc: CitableDoc }) {
  const citations = useMemo(() => buildCitations(doc), [doc]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<'apa' | 'chicago' | 'bibtex'>('apa');
  const [copied, setCopied] = useState(false);

  const current = citations.find((c) => c.key === active)!;

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard tak tersedia — pengguna bisa salin manual */
    }
  }

  if (!open) {
    return (
      <button className="btn secondary" onClick={() => setOpen(true)}>
        ❝ Kutip
      </button>
    );
  }

  return (
    <div className="cite-box">
      <div className="cite-tabs">
        {citations.map((c) => (
          <button
            key={c.key}
            className={c.key === active ? 'active' : ''}
            onClick={() => {
              setActive(c.key);
              setCopied(false);
            }}
          >
            {c.label}
          </button>
        ))}
        <button className="cite-close" onClick={() => setOpen(false)} aria-label="Tutup">
          ✕
        </button>
      </div>
      <pre className="cite-text">{current.text}</pre>
      <button className="btn" onClick={copy}>
        {copied ? '✓ Tersalin' : 'Salin'}
      </button>
    </div>
  );
}
