import HomeClient from './HomeClient';
import { fetchListingsServer } from '@/lib/serverListings';
import { getRequestLang, getRequestNonce } from '@/lib/serverLang';
import { filtersToPropertyQuery, propertyQueryToSearchString, readListingSearch } from '@/lib/mapQuery';
import { SITE_META } from '@/lib/seoI18n';
import { localizePath } from '@/lib/siteLang';
import { getSiteUrl } from '@/lib/siteUrl';
import { buildListingItemListJsonLd, jsonLdScript } from '@/lib/structuredData';

type RawSearch = Record<string, string | string[] | undefined>;

function toURLSearchParams(raw: RawSearch): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') sp.set(key, value);
    else if (Array.isArray(value) && value[0]) sp.set(key, value[0]);
  }
  return sp;
}

export const revalidate = 60;

/**
 * Homepage server entry. The first page of listings is fetched here so the
 * initial HTML contains real `/property/…` links, an H1 and a 250–400 word
 * intro — crawlers no longer see an empty “Loading…” shell.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearch>;
}) {
  const [lang, nonce, rawSearch] = await Promise.all([
    getRequestLang(),
    getRequestNonce(),
    searchParams,
  ]);
  const { filters, sort, page } = readListingSearch(toURLSearchParams(rawSearch || {}));
  const queryString = propertyQueryToSearchString({
    ...filtersToPropertyQuery(filters, sort, lang),
    page,
    limit: 40,
  });
  const listings = await fetchListingsServer(Object.fromEntries(new URLSearchParams(queryString)), {
    revalidate: 60,
  });
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
          filters,
          sort,
          page,
        }}
      />
    </>
  );
}
