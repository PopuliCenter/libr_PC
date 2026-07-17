/**
 * Mengubah URL menjadi embed yang aman — HANYA untuk penyedia allowlist
 * (YouTube, Spotify, SoundCloud). URL lain dikembalikan null dan ditampilkan
 * sebagai tautan biasa, sehingga tak ada iframe dari sumber sembarangan.
 */
export interface Embed {
  provider: string;
  src: string;
  kind: 'video' | 'audio';
}

export function toEmbed(rawUrl: string): Embed | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '');

  // YouTube
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v');
    if (v && /^[\w-]+$/.test(v)) {
      return { provider: 'YouTube', src: `https://www.youtube.com/embed/${v}`, kind: 'video' };
    }
    const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
    if (m) {
      return { provider: 'YouTube', src: `https://www.youtube.com/embed/${m[2]}`, kind: 'video' };
    }
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1);
    if (/^[\w-]+$/.test(id)) {
      return { provider: 'YouTube', src: `https://www.youtube.com/embed/${id}`, kind: 'video' };
    }
  }

  // Spotify (podcast episode/show, atau musik)
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/^\/(episode|show|track|playlist|album)\/([A-Za-z0-9]+)/);
    if (m) {
      return {
        provider: 'Spotify',
        src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
        kind: 'audio',
      };
    }
  }

  // SoundCloud
  if (host === 'soundcloud.com') {
    return {
      provider: 'SoundCloud',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(rawUrl)}&color=%2314508c`,
      kind: 'audio',
    };
  }

  return null;
}

export const LINK_KIND_LABEL: Record<string, string> = {
  video: '🎬 Video',
  podcast: '🎙️ Podcast',
  news: '📰 Berita',
  slides: '📊 Materi',
  dataset: '📁 Dataset',
  event: '📅 Acara',
  other: '🔗 Tautan',
};
