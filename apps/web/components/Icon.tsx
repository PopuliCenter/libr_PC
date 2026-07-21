/**
 * Set ikon garis (stroke) minimal — menggantikan emoji sebagai ikon antarmuka.
 * Ukuran mengikuti font (1em) dan warna mengikuti currentColor agar menyatu
 * dengan teks di sekitarnya.
 */
export type IconName =
  | 'book'
  | 'quote'
  | 'note'
  | 'download'
  | 'chart'
  | 'camera'
  | 'package'
  | 'users'
  | 'search'
  | 'close'
  | 'left'
  | 'right'
  | 'arrow-right'
  | 'external'
  | 'chat'
  | 'play'
  | 'audio'
  | 'news'
  | 'slides'
  | 'dataset'
  | 'calendar'
  | 'link'
  | 'check'
  | 'plus'
  | 'tag'
  | 'spark';

const PATHS: Record<IconName, React.ReactNode> = {
  book: <><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3H9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H3z" /><path d="M21 4.5A1.5 1.5 0 0 0 19.5 3H15a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H21z" /></>,
  quote: <><path d="M9 11H5.5A1.5 1.5 0 0 1 4 9.5v-1A2.5 2.5 0 0 1 6.5 6H8" /><path d="M9 11v2.5A4.5 4.5 0 0 1 4.5 18" /><path d="M20 11h-3.5A1.5 1.5 0 0 1 15 9.5v-1A2.5 2.5 0 0 1 17.5 6H19" /><path d="M20 11v2.5a4.5 4.5 0 0 1-4.5 4.5" /></>,
  note: <><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9L20 8.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" /><path d="M14 3v6h6" /><path d="M8 13h8M8 17h5" /></>,
  download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  camera: <><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v10A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5z" /><circle cx="12" cy="13" r="3.5" /></>,
  package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.5a3.5 3.5 0 0 1 0 7M18 20a6.4 6.4 0 0 0-2-4.7" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
  close: <><path d="m5 5 14 14M19 5 5 19" /></>,
  left: <><path d="m14 6-6 6 6 6" /></>,
  right: <><path d="m10 6 6 6-6 6" /></>,
  'arrow-right': <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5.5A1.5 1.5 0 0 1 16.5 21h-12A1.5 1.5 0 0 1 3 19.5v-12A1.5 1.5 0 0 1 4.5 6H10" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5" /></>,
  play: <><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m10 9.5 5 2.5-5 2.5z" /></>,
  audio: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h2.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M20 14h-2.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z" /></>,
  news: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5v13H5.5A1.5 1.5 0 0 1 4 17z" /><path d="M17 9h2.5A1.5 1.5 0 0 1 21 10.5V17a1.5 1.5 0 0 1-3 0" /><path d="M7.5 8h6M7.5 11.5h6M7.5 15h4" /></>,
  slides: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8.5 20h7" /></>,
  dataset: <><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" /><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  link: <><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.9 6.4" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.4-1.4" /></>,
  check: <><path d="m4.5 12.5 5 5 10-11" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  tag: <><path d="M3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h7a1.5 1.5 0 0 1 1.06.44l7 7a1.5 1.5 0 0 1 0 2.12l-7 7a1.5 1.5 0 0 1-2.12 0l-7-7A1.5 1.5 0 0 1 3 11.5z" /><circle cx="7.75" cy="7.75" r="1.25" /></>,
  spark: <><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" /><path d="M18.5 16.5 19 18l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 19l1.5-.5z" /></>,
};

export default function Icon({
  name,
  size = '1.05em',
  className,
  strokeWidth = 1.6,
}: {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
