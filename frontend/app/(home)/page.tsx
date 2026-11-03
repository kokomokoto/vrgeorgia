import HomeClient from './HomeClient';
import { fetchLatestListingsServer } from '@/lib/serverListings';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { SITE_META } from '@/lib/seoI18n';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl } from '@/lib/siteUrl';
import { buildListingItemListJsonLd, jsonLdScript } from '@/lib/structuredData';

export const revalidate = 60;

/**
 * Homepage server entry. The first page of listings is fetched here so the
 * initial HTML contains real `/property/…` links, an H1 and a 250–400 word
 * intro — crawlers no longer see an empty “Loading…” shell.
 */
export default async function HomePage() {
  const [lang, nonce] = await Promise.all([getRequestLang(), getRequestNonce()]);
  const listings = await fetchLatestListingsServer(lang, 12);
  const pageUrl = `${getSiteUrl()}${localizePath('/', lang)}`;
  const listJsonLd = listings.properties.length
    ? buildListingItemListJsonLd(pageUrl, SITE_META[lang].shortTitle, listings.properties, lang)
    : null;

  return (
    <>
      {listJsonLd ? (
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLdScript(listJsonLd) }}
        />
      ) : null}
      <HomeClient
        initialListings={{
          properties: listings.properties,
          total: listings.total,
          totalPages: listings.totalPages,
          typeCounts: listings.typeCounts,
          lang,
        }}
      />
    </>
  );
}
