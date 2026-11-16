import { notFound } from 'next/navigation';
import { fetchPropertyForShareMetadata } from '@/lib/propertyShareMetadata';
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
 * The listing is fetched on the server (same cached call the layout uses for
 * metadata, so no extra request) and handed to the client component, which
 * renders the full page in the initial HTML: H1, description, price, m², rooms,
 * district, photos with alt text, agent block and 3D-tour embed. Search engines
 * and AI crawlers no longer see a "Loading…" shell.
 *
 * Unlisted listings opened with a share token (`?t=`) are not visible to the
 * anonymous server fetch; the client component loads them with the token.
 * Without a token, a missing listing is a real 404 (not 200 + noindex) so GSC
 * stops listing deleted URLs under "Excluded by noindex".
 */
export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const shareToken = shareTokenFromSearchParams(sp);
  const lang = await getRequestLang();
  const property = await fetchPropertyForShareMetadata(id, lang);
  if (!property && !shareToken) notFound();
  return <PropertyDetailClient initialProperty={property} initialLang={lang} />;
}
