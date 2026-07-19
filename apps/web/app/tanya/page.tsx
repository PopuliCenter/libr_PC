'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useLang } from '../../components/LanguageContext';
import { api, RagAnswer } from '../../lib/api';

export default function AskPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RagAnswer | null>(null);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 3) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await api.post<RagAnswer>('/rag/ask', { question }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="container page"><p>…</p></div>;
  if (!user) {
    return (
      <div className="container page">
        <div className="alert info">
          {t('askLoginNote')} <Link href="/masuk">{t('signin')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page-title">{t('askTitle')}</h1>
      <p className="page-sub" style={{ maxWidth: 640 }}>{t('askSub')}</p>

      <form className="searchbar" onSubmit={submit}>
        <input
          type="search"
          placeholder={t('askPlaceholder')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('askThinking') : t('askBtn')}
        </button>
      </form>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <p className="rag-answer">{result.answer}</p>
            {result.mode === 'extractive' && (
              <p className="rag-note">{t('askExtractive')}</p>
            )}
          </div>

          {result.citations.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>{t('askSources')}</h2>
              <div className="rag-cites">
                {result.citations.map((c) => (
                  <div key={c.n} className="rag-cite">
                    <div className="rag-cite-head">
                      <span className="rag-cite-n">[{c.n}]</span>
                      <Link href={`/katalog/${c.slug}`}>{c.title}</Link>
                      <span className="rag-cite-page">{t('askPage')} {c.pageNo}</span>
                    </div>
                    <p className="rag-cite-snippet">{c.snippet}</p>
                    <Link className="rag-cite-open" href={`/baca/${c.slug}`}>
                      {t('openReader')} →
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
