'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useLang } from './LanguageContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const router = useRouter();

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-name">Populi Library</span>
          <span className="brand-sub">Perpustakaan Digital Populi Center</span>
        </Link>
        <nav className="nav">
          <Link href="/">{t('catalog')}</Link>
          <Link href="/tanya">{t('ask')}</Link>
          <Link href="/dampak">{t('impact')}</Link>
          {user ? (
            <>
              {(user.role === 'librarian' || user.role === 'superadmin') && (
                <Link href="/admin">{t('admin')}</Link>
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
                {t('logout')}
              </a>
            </>
          ) : (
            <>
              <Link href="/masuk">{t('signin')}</Link>
              <Link href="/daftar" className="btn secondary">
                {t('register')}
              </Link>
            </>
          )}
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            {lang === 'id' ? 'EN' : 'ID'}
          </button>
        </nav>
      </div>
    </header>
  );
}
