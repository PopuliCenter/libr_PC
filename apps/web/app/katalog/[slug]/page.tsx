import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { API_URL, DocumentItem } from '../../../lib/api';
import { citationMeta } from '../../../lib/citations';
import DocumentDetailClient from './DocumentDetailClient';

/** Ambil koleksi (publik) di server; fetch dedup Next dipakai bersama metadata. */
async function getDoc(slug: string): Promise<DocumentItem | null> {
  const res = await fetch(`${API_URL}/documents/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) return { title: 'Koleksi tidak ditemukan — Populi Library' };

  const description = doc.abstract
    ? doc.abstract.slice(0, 200)
    : `${doc.collectionType} oleh ${doc.authors.join(', ')}${doc.year ? ` (${doc.year})` : ''}.`;

  return {
    title: `${doc.title} — Populi Library`,
    description,
    // Meta tag Google Scholar (citation_*) — dirender di server agar terindeks.
    other: citationMeta(doc),
    openGraph: {
      title: doc.title,
      description,
      type: 'article',
    },
  };
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();
  return <DocumentDetailClient initialDoc={doc} />;
}
