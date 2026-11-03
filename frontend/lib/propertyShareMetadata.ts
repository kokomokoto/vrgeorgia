import type { Metadata } from 'next';
import type { Property } from '@/lib/types';
import { applyCloudinaryTransform } from '@/lib/imageUrl';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';
import { canonicalPropertyPathId } from '@/lib/seoDuplicateCanonical';
import { SITE_NAME, getSiteHost, getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { DEFAULT_SITE_LANG, localizePath, ogLocale, SITE_LANGS, type SiteLang } from '@/lib/siteLang';
import {
  SEO_WORDS,
  SITE_META,
  TYPE_LABELS_I18N,
  buildLanguageAlternates,
  dealLabel,
  typeLabel,
} from '@/lib/seoI18n';

const SITE_URL = getSiteUrl();
const SITE_HOST = getSiteHost();

function serverApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://vrgeorgia-api.onrender.com';
  return 'http://localhost:5000';
}

/**
 * Server-side property fetch used by metadata, middleware (social crawlers),
 * the server-rendered listing page and the sitemap. Cached per id+lang for
 * 5 minutes; Next dedupes identical calls within one request.
 */
export async function fetchPropertyForShareMetadata(
  id: string,
  lang: SiteLang = DEFAULT_SITE_LANG
): Promise<Property | null> {
  try {
    const res = await fetch(
      `${serverApiBase()}/api/properties/${encodeURIComponent(id)}?lang=${lang}&meta=1`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { property?: Property };
    return data.property ?? null;
  } catch {
    return null;
  }
}

function resolveAbsoluteImageUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${serverApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}

function getMainPhoto(property: Property): string | undefined {
  const mainIndex = Math.min(
    Math.max(0, property.mainPhoto ?? 0),
    Math.max(0, (property.photos?.length ?? 0) - 1)
  );
  return property.photos?.[mainIndex] ?? property.photos?.[0];
}

/** Remote listing photo URL (Cloudinary JPEG 1200×630). Prefer getPropertyOpenGraphImageUrl for social meta. */
export function getPropertyShareImageUrl(property: Property): string | undefined {
  const photo = getMainPhoto(property);
  if (!photo) return undefined;

  const absolute = resolveAbsoluteImageUrl(photo);
  if (absolute.includes('res.cloudinary.com')) {
    return applyCloudinaryTransform(absolute, 'w_1200,h_630,c_fill,f_jpg,q_auto');
  }
  return absolute;
}

/**
 * Same-origin OG image URL for Meta (Facebook / Instagram / WhatsApp / Messenger).
 * Direct Cloudinary URLs often render as a blank preview card even when title works.
 */
export function getPropertyOpenGraphImageUrl(id: string, property: Property): string {
  if (getPropertyShareImageUrl(property)) {
    return `${SITE_URL}/og/property/${encodeURIComponent(id)}`;
  }
  const path = DEFAULT_OG_IMAGE.url.startsWith('/')
    ? DEFAULT_OG_IMAGE.url
    : `/${DEFAULT_OG_IMAGE.url}`;
  return `${SITE_URL}${path}`;
}

function getOwnerName(property: Property): string | undefined {
  const owner = property.userId;
  if (!owner || typeof owner === 'string') return undefined;
  return owner.name?.trim() || undefined;
}

function formatPriceBit(property: Property): string {
  const { currencySymbol, totalPrice, pricePerSqm } = getPropertyPrices(property);
  if (totalPrice != null) return `${currencySymbol}${totalPrice.toLocaleString('en-US')}`;
  if (pricePerSqm != null) return `${currencySymbol}${pricePerSqm.toLocaleString('en-US')}/m²`;
  return '';
}

export function buildPropertyShareDescription(
  property: Property,
  lang: SiteLang = DEFAULT_SITE_LANG
): string {
  const parts: string[] = [];
  const type = typeLabel(property.type, lang);
  const deal = dealLabel(property.dealType, lang, property.status);
  if (type && deal) parts.push(`${type} ${deal}`);

  const address = getPropertyAddressLine(property);
  if (address) parts.push(address);

  const specs: string[] = [];
  if (property.rooms) specs.push(`${property.rooms} ${SEO_WORDS.rooms[lang]}`);
  if (property.sqm) specs.push(`${property.sqm} ${SEO_WORDS.sqm[lang]}`);
  if (specs.length) parts.push(specs.join(', '));

  const price = formatPriceBit(property);
  if (price) parts.push(price);

  parts.push(SITE_HOST);
  return parts.join(' · ');
}

/**
 * Google-ის `<title>`: აგენტის სათაურს ემატება ქუჩა, ფასი და ნომერი,
 * რომ ერთნაირი „იყიდება“ განცხადებები დუბლიკატად არ ჩაითვალოს.
 * ეკრანზე H1 უცვლელია.
 */
function titleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPropertyDocumentTitle(property: Property, lang: SiteLang = DEFAULT_SITE_LANG): string {
  const base = cleanListingTitle(property.title) || `${typeLabel(property.type, lang)} ${dealLabel(property.dealType, lang, property.status)}`.trim();
  const street = property.street?.trim() || '';
  const price = formatPriceBit(property);
  const idBit = property.numericId ? `#${property.numericId}` : '';
  const baseKey = titleKey(base);
  const parts = [street, price, idBit].filter((part) => {
    if (!part) return false;
    const key = titleKey(part);
    return key && !baseKey.includes(key);
  });
  return parts.length ? `${base} — ${parts.join(' · ')}` : base;
}

/**
 * Agents sometimes paste titles with stray punctuation / double spaces /
 * trailing separators ("ბინა იყიდება - - ", "ბინა ,,საბურთალოზე").
 * Normalise for `<title>`, H1 and schema while leaving the DB untouched.
 */
export function cleanListingTitle(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([,.;:!?\-–—|/])\1+/g, '$1')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,.;:!?\-–—|/]+/, '')
    .replace(/[\s,;:\-–—|/]+$/, '')
    .trim();
}

function buildKeywords(property: Property, lang: SiteLang): string[] {
  const keywords = [
    SEO_WORDS.realEstateGeorgia[lang],
    SITE_NAME,
    property.city,
    property.tbilisiDistrict,
    typeLabel(property.type, lang),
    dealLabel(property.dealType, lang, property.status),
    TYPE_LABELS_I18N[property.type]?.en,
    'real estate',
    'Georgia',
    'Tbilisi',
  ].filter((value): value is string => Boolean(value && String(value).trim()));

  return [...new Set(keywords)];
}

type OgImage = {
  url: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
};

function buildOgImage(id: string, title: string, property: Property): OgImage {
  const primary = getPropertyOpenGraphImageUrl(id, property);

  return {
    url: primary,
    secureUrl: primary.startsWith('https://') ? primary : undefined,
    width: 1200,
    height: 630,
    alt: title,
    type: 'image/jpeg',
  };
}

/**
 * სრული social preview — Open Graph + Twitter/X + დამატებითი name-ტეგები.
 * მუშაობს: Facebook, Instagram (ლინკი), WhatsApp, Telegram, Viber, TikTok,
 * LinkedIn, X/Twitter, Discord, Slack, iMessage, Pinterest და სხვ.
 */
export function buildPropertyShareMetadata(
  id: string,
  property: Property,
  lang: SiteLang = DEFAULT_SITE_LANG
): Metadata {
  const title = buildPropertyDocumentTitle(property, lang);
  const description = buildPropertyShareDescription(property, lang);
  const canonicalId = canonicalPropertyPathId(id, property);
  const path = `/property/${canonicalId}`;
  const pageUrl = `${SITE_URL}${localizePath(path, lang)}`;
  const isDuplicate = Boolean(property.canonicalId && property.canonicalId !== id);
  const ownerName = getOwnerName(property);
  const keywords = buildKeywords(property, lang);
  const ogImage = buildOgImage(id, title, property);
  const primaryImage = ogImage.url;

  return {
    title,
    description,
    keywords,
    authors: ownerName ? [{ name: ownerName }] : [{ name: SITE_NAME }],
    creator: ownerName || SITE_NAME,
    publisher: SITE_NAME,
    category: 'real estate',
    metadataBase: new URL(SITE_URL),
    alternates: buildLanguageAlternates(path, lang),
    robots: isDuplicate
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title,
      description,
      siteName: SITE_NAME,
      locale: ogLocale(lang),
      alternateLocale: SITE_LANGS.filter((l) => l !== lang).map(ogLocale),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@vhome',
      title,
      description,
      images: {
        url: primaryImage,
        alt: title,
        secureUrl: primaryImage.startsWith('https://') ? primaryImage : undefined,
      },
    },
    other: {
      'apple-mobile-web-app-title': title,
      'application-name': SITE_NAME,
      'msapplication-TileColor': '#2563eb',
      'theme-color': '#2563eb',
    },
  };
}

export function buildDefaultShareMetadata(lang: SiteLang = DEFAULT_SITE_LANG): Metadata {
  const title = SITE_META[lang].shortTitle;
  const description = SITE_META[lang].description;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${localizePath('/', lang)}`,
      title,
      description,
      siteName: SITE_NAME,
      locale: ogLocale(lang),
      alternateLocale: SITE_LANGS.filter((l) => l !== lang).map(ogLocale),
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@vhome',
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
    other: {
      'application-name': SITE_NAME,
      'apple-mobile-web-app-title': SITE_NAME,
      'msapplication-TileColor': '#2563eb',
      'theme-color': '#2563eb',
    },
  };
}

/** Missing property / soft-404 — keep URL out of Google index. */
export function buildMissingPropertyMetadata(id: string, lang: SiteLang = DEFAULT_SITE_LANG): Metadata {
  const pageUrl = `${SITE_URL}${localizePath(`/property/${id}`, lang)}`;
  const title = SEO_WORDS.notFoundListing[lang];
  const description = SEO_WORDS.notFoundListingDesc[lang];
  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: pageUrl },
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
      locale: ogLocale(lang),
    },
  };
}

/** Absolute listing photo URL for sitemap / OG helpers. */
export function absoluteListingImageUrl(path?: string | null): string | undefined {
  if (!path?.trim()) return undefined;
  return resolveAbsoluteImageUrl(path.trim());
}
