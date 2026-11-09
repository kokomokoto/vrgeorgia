import type { MetadataRoute } from 'next';
import { absoluteListingImageUrl, getPropertyShareImageUrl } from '@/lib/propertyShareMetadata';
import { seoDuplicateIdsToDrop, type SeoListing } from '@/lib/seoDuplicateCanonical';
import { allLandingSegments, cityHubPath, indexableLandingPaths, LANDING_CITIES, landingPath } from '@/lib/landingPages';
import { getSiteUrl } from '@/lib/siteUrl';
import { localizePath, SITE_LANGS, type SiteLang } from '@/lib/siteLang';
import type { Property } from '@/lib/types';

/** Homepage canonical is https://vhome.ge with no trailing slash. */
function absoluteLocalized(path: string, lang: SiteLang): string {
  const localized = localizePath(path, lang);
  if (localized === '/') return getSiteUrl();
  return `${getSiteUrl()}${localized}`;
}

function languageAlternates(path: string): NonNullable<MetadataRoute.Sitemap[number]['alternates']> {
  const languages: Record<string, string> = {};
  for (const lang of SITE_LANGS) {
    languages[lang] = absoluteLocalized(path, lang);
  }
  return { languages };
}

function localizedUrl(path: string): string {
  return absoluteLocalized(path, 'ka');
}

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://vrgeorgia-api.onrender.com';
  return 'http://localhost:5000';
}

type ListedProperty = SeoListing & {
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  photos?: string[];
  mainPhoto?: number;
};

type ListedAgent = {
  _id: string;
  updatedAt?: string;
};

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function fetchPublicProperties(): Promise<ListedProperty[]> {
  try {
    const all: ListedProperty[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `${apiBase()}/api/properties?limit=500&page=${page}&sort=date_desc&lang=ka`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = (await res.json()) as {
        properties?: ListedProperty[];
        totalPages?: number;
      };
      const batch = Array.isArray(data.properties) ? data.properties : [];
      all.push(...batch);
      totalPages = Math.max(1, Number(data.totalPages) || 1);
      page += 1;
    } while (page <= totalPages && page <= 40);
    return all;
  } catch {
    return [];
  }
}

async function fetchPublicAgents(): Promise<ListedAgent[]> {
  try {
    const all: ListedAgent[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(`${apiBase()}/api/agents?limit=100&page=${page}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        agents?: ListedAgent[];
        totalPages?: number;
      };
      const batch = Array.isArray(data.agents) ? data.agents : [];
      all.push(...batch);
      totalPages = Math.max(1, Number(data.totalPages) || 1);
      page += 1;
    } while (page <= totalPages && page <= 50);
    return all;
  } catch {
    return [];
  }
}

function propertySitemapImages(p: ListedProperty): NonNullable<MetadataRoute.Sitemap[number]['images']> {
  const asProperty = p as unknown as Property;
  const share = getPropertyShareImageUrl(asProperty);
  const images: string[] = [];
  if (share) images.push(share);
  for (const photo of p.photos || []) {
    const abs = absoluteListingImageUrl(photo);
    if (abs && !images.includes(abs) && images.length < 5) images.push(abs);
  }
  return images;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'hourly', priority: 1 },
    { path: '/map', changeFrequency: 'hourly', priority: 0.9 },
    { path: '/3d-tours', changeFrequency: 'daily', priority: 0.85 },
    { path: '/agents', changeFrequency: 'daily', priority: 0.8 },
    { path: '/services', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/services/arch', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/docs', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/planning', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/interior', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/landscape', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/vis', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/heritage', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/services/consult', changeFrequency: 'monthly', priority: 0.55 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/mortgage-calculator', changeFrequency: 'monthly', priority: 0.5 },
  ];
  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map((r) => ({
    url: localizedUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    alternates: languageAlternates(r.path),
  }));

  const [listedProperties, agents] = await Promise.all([
    fetchPublicProperties(),
    fetchPublicAgents(),
  ]);
  const indexablePaths = listedProperties.length ? indexableLandingPaths(listedProperties) : null;
  const landingRoutes: MetadataRoute.Sitemap = [
    ...LANDING_CITIES.flatMap((city) => {
      const path = cityHubPath(city);
      if (indexablePaths && !indexablePaths.has(path)) return [];
      return [{
        url: localizedUrl(path),
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.85,
        alternates: languageAlternates(path),
      }];
    }),
    ...allLandingSegments().flatMap((seg) => {
      const path = landingPath(seg.city, seg.type, seg.deal, seg.district);
      if (indexablePaths && !indexablePaths.has(path)) return [];
      return [{
        url: localizedUrl(path),
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: seg.district ? 0.7 : 0.8,
        alternates: languageAlternates(path),
      }];
    }),
  ];
  const duplicateIds = seoDuplicateIdsToDrop(listedProperties);
  const properties = listedProperties.filter((p) => !duplicateIds.has(String(p._id)));

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((p) => {
    const images = propertySitemapImages(p);
    const path = `/property/${p.urlKey || p._id}`;
    return {
      url: localizedUrl(path),
      lastModified: parseDate(p.updatedAt) || parseDate(p.createdAt) || now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
      alternates: languageAlternates(path),
      ...(images.length ? { images } : {}),
    };
  });

  const agentRoutes: MetadataRoute.Sitemap = agents.map((a) => {
    const path = `/agents/${a._id}`;
    return {
      url: localizedUrl(path),
      lastModified: parseDate(a.updatedAt) || now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: languageAlternates(path),
    };
  });

  return [...staticRoutes, ...landingRoutes, ...propertyRoutes, ...agentRoutes];
}
