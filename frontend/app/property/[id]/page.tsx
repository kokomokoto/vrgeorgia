import { fetchPropertyForShareMetadata } from '@/lib/propertyShareMetadata';
import { getRequestLang } from '@/lib/serverLang';
import PropertyDetailClient from './PropertyDetailClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

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
 */
export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lang = await getRequestLang();
  const property = await fetchPropertyForShareMetadata(id, lang);
  return <PropertyDetailClient initialProperty={property} initialLang={lang} />;
}
