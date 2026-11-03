import { getApiBase } from '@/lib/config';
import type { Property } from '@/lib/types';
import type { LandingStats } from '@/lib/landingPages';
import type { SiteLang } from '@/lib/siteLang';

/**
 * Server-side listing fetches (home, landing pages, hubs, sitemap).
 * All calls use Next's fetch cache with short revalidation so the HTML is
 * fresh but the API is not hit on every crawl.
 */

export type ListingsPage = {
  properties: Property[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  typeCounts?: Record<string, number>;
};

const EMPTY_PAGE: ListingsPage = { properties: [], total: 0, page: 1, totalPages: 1, limit: 0 };

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

export async function fetchListingsServer(
  params: Record<string, string | number | boolean | undefined | null>,
  opts: { revalidate?: number; timeoutMs?: number } = {}
): Promise<ListingsPage> {
  const base = getApiBase();
  const url = `${base}/api/properties?${qs(params)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: opts.revalidate ?? 120 },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (!res.ok) return EMPTY_PAGE;
    const data = (await res.json()) as Partial<ListingsPage>;
    return {
      properties: Array.isArray(data.properties) ? data.properties : [],
      total: Number(data.total) || 0,
      page: Number(data.page) || 1,
      totalPages: Number(data.totalPages) || 1,
      limit: Number(data.limit) || 0,
      typeCounts: data.typeCounts,
    };
  } catch {
    return EMPTY_PAGE;
  }
}

export async function fetchListingStatsServer(
  params: Record<string, string | number | boolean | undefined | null>,
  opts: { revalidate?: number } = {}
): Promise<LandingStats | null> {
  const base = getApiBase();
  const url = `${base}/api/properties/stats?${qs(params)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: opts.revalidate ?? 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LandingStats;
  } catch {
    return null;
  }
}

/** Latest public listings (home SSR). */
export async function fetchLatestListingsServer(lang: SiteLang, limit = 40): Promise<ListingsPage> {
  return fetchListingsServer(
    { priceType: 'total', sort: 'date_desc', lang, page: 1, limit, includeTypeCounts: 'true' },
    { revalidate: 60 }
  );
}

/** Listings with a 3D / VR tour (tours hub). */
export async function fetchTourListingsServer(lang: SiteLang, limit = 24): Promise<ListingsPage> {
  return fetchListingsServer(
    { has3d: 'true', priceType: 'total', sort: 'date_desc', lang, page: 1, limit },
    { revalidate: 300 }
  );
}
