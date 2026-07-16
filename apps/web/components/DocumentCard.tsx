import Link from 'next/link';
import { DocumentItem } from '../lib/api';

const ACCESS_LABEL: Record<string, { text: string; cls: string }> = {
  OPEN: { text: 'Terbuka', cls: 'open' },
  MEMBER: { text: 'Anggota', cls: 'member' },
  LOAN: { text: 'Sewa', cls: 'loan' },
};

export default function DocumentCard({ doc }: { doc: DocumentItem }) {
  const access = ACCESS_LABEL[doc.accessType] ?? ACCESS_LABEL.MEMBER;
  return (
    <article className="card doc-card">
      <div>
        <span className={`badge ${access.cls}`}>{access.text}</span>{' '}
        <span className="badge type">{doc.collectionType}</span>
      </div>
      <h3>
        <Link href={`/katalog/${doc.slug}`}>{doc.title}</Link>
      </h3>
      <div className="meta">
        {doc.authors.join(', ')}
        {doc.year ? ` · ${doc.year}` : ''}
        {doc.publisher ? ` · ${doc.publisher}` : ''}
      </div>
      {doc.abstract && <p className="abstract">{doc.abstract}</p>}
    </article>
  );
}
