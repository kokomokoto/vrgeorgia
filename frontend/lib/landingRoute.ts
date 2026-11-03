import type { Metadata } from 'next';
import type { LandingSegment } from '@/lib/landingPages';
import {
  landingApiQuery,
  landingDescription,
  landingPath,
  landingTitle,
} from '@/lib/landingPages';
import { fetchListingStatsServer, fetchListingsServer } from '@/lib/serverListings';
import { buildLanguageAlternates, localizedOpenGraph } from '@/lib/seoI18n';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import type { SiteLang } from '@/lib/siteLang';
import { isNoIndexHost } from '@/lib/siteUrl';

export const LANDING_LISTINGS_LIMIT = 24;

/** Stats + latest listings for a segment (parallel, cached). */
export async function loadLandingSegment(seg: LandingSegment, lang: SiteLang) {
  const q = landingApiQuery(seg);
  const [stats, page] = await Promise.all([
    fetchListingStatsServer(q),
    fetchListingsServer(
      { ...q, priceType: 'total', sort: 'date_desc', lang, page: 1, limit: LANDING_LISTINGS_LIMIT },
      { revalidate: 300 }
    ),
  ]);
  return { stats, listings: page.properties, total: page.total };
}

export async function landingSegmentMetadata(seg: LandingSegment, lang: SiteLang): Promise<Metadata> {
  const stats = await fetchListingStatsServer(landingApiQuery(seg));
  const path = landingPath(seg.city, seg.type, seg.deal, seg.district);
  const title = landingTitle(seg, lang, stats);
  const description = landingDescription(seg, lang, stats);
  const hasListings = (stats?.count ?? 0) > 0;
  const noIndex = isNoIndexHost() || !hasListings;
  return {
    title: { absolute: title },
    description,
    alternates: buildLanguageAlternates(path, lang),
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: localizedOpenGraph(lang, { title, description, path, images: [DEFAULT_OG_IMAGE] }),
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_OG_IMAGE.url] },
  };
}
