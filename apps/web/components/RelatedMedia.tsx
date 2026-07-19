'use client';

import { RelatedLink } from '../lib/api';
import { LINK_KIND_LABEL, toEmbed } from '../lib/embed';
import { useLang } from './LanguageContext';

/**
 * Menampilkan tautan acara/multimedia terkait koleksi (PRD I4): pemutar embed
 * inline untuk penyedia tepercaya (YouTube/Spotify/SoundCloud) + daftar tautan.
 */
export default function RelatedMedia({ links }: { links: RelatedLink[] }) {
  const { t } = useLang();
  if (!links || links.length === 0) return null;

  const embeds = links
    .map((l) => ({ link: l, embed: toEmbed(l.url) }))
    .filter((x) => x.embed);

  return (
    <section className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{t('relatedMedia')}</h2>

      {embeds.map(({ link, embed }) => (
        <div key={link.url} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {embed!.provider === 'YouTube' ? '🎬' : '🎧'} {link.title}
          </div>
          <div className={`embed-frame ${embed!.kind}`}>
            <iframe
              src={embed!.src}
              title={link.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ))}

      <ul className="related-links">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer">
              <span className="lk-kind">{LINK_KIND_LABEL[l.kind] ?? '🔗'}</span>
              {l.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
