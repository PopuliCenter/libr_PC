'use client';

import { RelatedLink } from '../lib/api';
import { LINK_KIND_ICON, LINK_KIND_LABEL, toEmbed } from '../lib/embed';
import Icon, { IconName } from './Icon';
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
    <section className="card section-block">
      <h2 className="section-title">{t('relatedMedia')}</h2>

      {embeds.map(({ link, embed }) => (
        <div key={link.url} className="embed-block">
          <div className="embed-caption">
            <Icon name={embed!.kind === 'video' ? 'play' : 'audio'} />
            {link.title}
            <span className="embed-provider">{embed!.provider}</span>
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
              <Icon name={(LINK_KIND_ICON[l.kind] ?? 'link') as IconName} />
              {l.title}
              <span className="lk-kind">{LINK_KIND_LABEL[l.kind] ?? 'Tautan'}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
