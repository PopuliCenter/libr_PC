'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-name">Populi Library</span>
          <span className="brand-sub">Perpustakaan Digital Populi Center</span>
        </Link>
        <nav className="nav">
          <Link href="/">Katalog</Link>
          {user ? (
            <>
              {(user.role === 'librarian' || user.role === 'superadmin') && (
                <Link href="/admin">Admin</Link>
              )}
              <Link href="/akun">{user.name.split(' ')[0]}</Link>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                  router.push('/');
                }}
              >
                Keluar
              </a>
            </>
          ) : (
            <>
              <Link href="/masuk">Masuk</Link>
              <Link href="/daftar" className="btn secondary">
                Daftar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
