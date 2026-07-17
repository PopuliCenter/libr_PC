import type { Metadata } from 'next';
import { AuthProvider } from '../components/AuthContext';
import ChatWidget from '../components/ChatWidget';
import Header from '../components/Header';
import { API_URL } from '../lib/api';
import './globals.css';

export const metadata: Metadata = {
  title: 'Populi Library — Perpustakaan Digital Populi Center',
  description:
    'Katalog publikasi, laporan riset, dan koleksi digital Populi Center. Baca online, gratis untuk anggota terdaftar.',
  // Penemuan otomatis umpan RSS "Publikasi Terbaru" (PRD I3).
  alternates: {
    types: {
      'application/rss+xml': `${API_URL}/feed.rss`,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <footer className="site-footer">
            © {new Date().getFullYear()} Populi Center — library@populicenter.org
          </footer>
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
