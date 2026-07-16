'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { saveTokens } from '../../../lib/api';

/** Tujuan redirect setelah login Google berhasil di sisi API. */
function GoogleCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      saveTokens(accessToken, refreshToken);
      // Lanjutkan ke tujuan yang tersimpan (mis. alur consent SSO), jika ada.
      const next = sessionStorage.getItem('postLoginNext');
      sessionStorage.removeItem('postLoginNext');
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      refresh().then(() => router.push(dest));
    } else {
      router.push('/masuk');
    }
  }, [params, router, refresh]);

  return (
    <div className="container page">
      <p>Menyelesaikan login…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackInner />
    </Suspense>
  );
}
