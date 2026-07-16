'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { api, saveTokens } from '../../lib/api';

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<'busy' | 'error'>('busy');
  const [message, setMessage] = useState('Memverifikasi email Anda…');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const email = params.get('email');
    const token = params.get('token');
    if (!email || !token) {
      setStatus('error');
      setMessage('Tautan verifikasi tidak lengkap.');
      return;
    }
    api
      .post<{ accessToken: string; refreshToken: string }>(
        '/auth/verify-email',
        { email, token },
      )
      .then(async (tokens) => {
        saveTokens(tokens.accessToken, tokens.refreshToken);
        await refresh();
        router.push('/?verified=1');
      })
      .catch((err) => {
        setStatus('error');
        setMessage((err as Error).message);
      });
  }, [params, router, refresh]);

  return (
    <div className="container page">
      <div className="card auth-card">
        <h1 className="page-title">Verifikasi Email</h1>
        <div className={`alert ${status === 'error' ? 'error' : 'info'}`}>
          {message}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
