'use client';

import Link from 'next/link';
import { DocumentItem } from '../lib/api';
import { docAbstract, docTitle } from '../lib/i18n';
import { useLang } from './LanguageContext';

const ACCESS_CLS: Record<string, string> = {
  OPEN: 'open',
  MEMBER: 'member',
  LOAN: 'loan',
  INTERNAL: 'internal',
};

export default function DocumentCard({ doc }: { doc: DocumentItem }) {
  const { lang, t } = useLang();
  const cls = ACCESS_CLS[doc.accessType] ?? 'member';
  const abstract = docAbstract(doc, lang);
  return (
    <article className="card doc-card">
      <div>
        <span className={`badge ${cls}`}>{t(doc.accessType)}</span>{' '}
        <span className="badge type">{doc.collectionType}</span>
      </div>
      <h3>
        <Link href={`/katalog/${doc.slug}`}>{docTitle(doc, lang)}</Link>
      </h3>
      <div className="meta">
        {doc.authors.join(', ')}
        {doc.year ? ` · ${doc.year}` : ''}
        {doc.publisher ? ` · ${doc.publisher}` : ''}
      </div>
      {abstract && <p className="abstract">{abstract}</p>}
    </article>
  );
}
