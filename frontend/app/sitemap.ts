import type { MetadataRoute } from 'next';
import { absoluteListingImageUrl, getPropertyShareImageUrl } from '@/lib/propertyShareMetadata';
import { getSiteUrl } from '@/lib/siteUrl';
import type { Property } from '@/lib/types';

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://vrgeorgia-api.onrender.com';
  return 'http://localhost:5000';
}

type ListedProperty = {
  _id: string;
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
  const SITE_URL = getSiteUrl();
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/map`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/agents`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/services/arch`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/planning`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/interior`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/landscape`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/vis`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/heritage`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/services/consult`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/mortgage-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const [properties, agents] = await Promise.all([
    fetchPublicProperties(),
    fetchPublicAgents(),
  ]);

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((p) => {
    const images = propertySitemapImages(p);
    return {
      url: `${SITE_URL}/property/${p._id}`,
      lastModified: parseDate(p.updatedAt) || parseDate(p.createdAt) || now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
      ...(images.length ? { images } : {}),
    };
  });

  const agentRoutes: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${SITE_URL}/agents/${a._id}`,
    lastModified: parseDate(a.updatedAt) || now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...propertyRoutes, ...agentRoutes];
}
