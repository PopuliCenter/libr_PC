'use client';

import { useEffect, useState } from 'react';
import { api, Category } from '../lib/api';

/**
 * Pemilih topik minat (dari kategori katalog) + persetujuan newsletter.
 * Dipakai di halaman daftar & akun untuk segmentasi diseminasi (PRD I6).
 */
export default function InterestPicker({
  interests,
  onInterests,
  consent,
  onConsent,
}: {
  interests: string[];
  onInterests: (next: string[]) => void;
  consent: boolean;
  onConsent: (next: boolean) => void;
}) {
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCats).catch(() => undefined);
  }, []);

  const toggle = (slug: string) =>
    onInterests(
      interests.includes(slug)
        ? interests.filter((s) => s !== slug)
        : [...interests, slug],
    );

  return (
    <>
      <div className="field">
        <label>Topik minat</label>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Pilih topik yang Anda minati untuk menerima kabar terbitan baru yang relevan.
        </p>
        <div className="interest-grid">
          {cats.map((c) => (
            <label
              key={c.slug}
              className={`interest-chip ${interests.includes(c.slug) ? 'on' : ''}`}
            >
              <input
                type="checkbox"
                checked={interests.includes(c.slug)}
                onChange={() => toggle(c.slug)}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <label className="consent-row">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsent(e.target.checked)}
        />
        <span>
          Saya bersedia menerima pemberitahuan terbitan baru sesuai minat (email/WhatsApp).
          Dapat dibatalkan kapan saja di halaman Akun.
        </span>
      </label>
    </>
  );
}
