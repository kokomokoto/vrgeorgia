import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  buildMissingPropertyMetadata,
  buildPropertyShareMetadata,
  fetchPropertyForShareMetadata,
} from '@/lib/propertyShareMetadata';
import { getRequestLang } from '@/lib/serverLang';
import PropertyDetailClient from './PropertyDetailClient';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function shareTokenFromSearchParams(
  sp: Record<string, string | string[] | undefined> | undefined
): string | undefined {
  const raw = sp?.t;
  if (typeof raw === 'string') return raw.trim() || undefined;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0].trim() || undefined;
  return undefined;
}

/**
 * Listing page — server component.
 *
 * Unlisted listings need `?t=` share token. Sold listings are viewable on the
 * detail page (still excluded from public search lists). Without a token, a
 * missing listing is a real 404 so GSC stops indexing deleted URLs.
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const shareToken = shareTokenFromSearchParams(sp);
  const lang = await getRequestLang();
  const property = await fetchPropertyForShareMetadata(id, lang, { shareToken });
  if (!property) return buildMissingPropertyMetadata(id, lang);
  return buildPropertyShareMetadata(id, property, lang);
}

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const shareToken = shareTokenFromSearchParams(sp);
  const lang = await getRequestLang();
  const property = await fetchPropertyForShareMetadata(id, lang, { shareToken });
  if (!property && !shareToken) notFound();
  return <PropertyDetailClient initialProperty={property} initialLang={lang} />;
}
