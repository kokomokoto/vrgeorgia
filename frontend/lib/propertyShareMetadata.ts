import type { Metadata } from 'next';
import type { Property } from '@/lib/types';
import { applyCloudinaryTransform } from '@/lib/imageUrl';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';

const SITE_URL = 'https://vrgeorgia.ge';
const SITE_NAME = 'Vhome';
const SITE_HOST = 'vrgeorgia.ge';

const DEAL_LABELS: Record<string, string> = {
  sale: 'იყიდება',
  rent: 'ქირავდება',
  mortgage: 'გირავდება',
};

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  commercial: 'კომერციული',
  land: 'მიწა',
  cottage: 'კოტეჯი',
  hotel: 'სასტუმრო',
  building: 'შენობა',
  warehouse: 'საწყობი',
  parking: 'პარკინგი',
  business: 'ბიზნესი',
};

function serverApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://vrgeorgia-api.onrender.com';
  return 'http://localhost:5000';
}

export async function fetchPropertyForShareMetadata(id: string): Promise<Property | null> {
  try {
    const res = await fetch(`${serverApiBase()}/api/properties/${encodeURIComponent(id)}?lang=ka`, {
      next: { revalidate: 300 },
    });
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

/** OG სურათი — JPEG 1200×630 (Facebook, WhatsApp, Telegram, Viber, LinkedIn, Discord…) */
export function getPropertyShareImageUrl(property: Property): string | undefined {
  const photo = getMainPhoto(property);
  if (!photo) return undefined;

  const absolute = resolveAbsoluteImageUrl(photo);
  if (absolute.includes('res.cloudinary.com')) {
    return applyCloudinaryTransform(absolute, 'w_1200,h_630,c_fill,f_jpg,q_auto');
  }
  return absolute;
}

function getOwnerName(property: Property): string | undefined {
  const owner = property.userId;
  if (!owner || typeof owner === 'string') return undefined;
  return owner.name?.trim() || undefined;
}

export function buildPropertyShareDescription(property: Property): string {
  const parts: string[] = [];
  const typeLabel = TYPE_LABELS[property.type] || property.type;
  const dealLabel = DEAL_LABELS[property.dealType || 'sale'] || '';
  if (typeLabel && dealLabel) parts.push(`${dealLabel} ${typeLabel}`);

  const address = getPropertyAddressLine(property);
  if (address) parts.push(address);

  const { currencySymbol, totalPrice, pricePerSqm } = getPropertyPrices(property);
  if (totalPrice != null) {
    parts.push(`${currencySymbol}${totalPrice.toLocaleString('en-US')}`);
  } else if (pricePerSqm != null) {
    parts.push(`${currencySymbol}${pricePerSqm.toLocaleString('en-US')}/m²`);
  }

  parts.push(SITE_HOST);
  return parts.join(' · ');
}

function buildKeywords(property: Property): string[] {
  const keywords = [
    'უძრავი ქონება',
    'საქართველო',
    SITE_NAME,
    property.city,
    property.tbilisiDistrict,
    TYPE_LABELS[property.type],
    DEAL_LABELS[property.dealType || 'sale'],
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

function buildOgImage(title: string, property: Property): OgImage | undefined {
  const primary = getPropertyShareImageUrl(property);
  if (!primary) return undefined;

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
export function buildPropertyShareMetadata(id: string, property: Property): Metadata {
  const title = property.title?.trim() || 'განცხადება';
  const description = buildPropertyShareDescription(property);
  const pageUrl = `${SITE_URL}/property/${id}`;
  const ownerName = getOwnerName(property);
  const keywords = buildKeywords(property);
  const ogImage = buildOgImage(title, property);
  const primaryImage = ogImage?.url;

  return {
    title,
    description,
    keywords,
    authors: ownerName ? [{ name: ownerName }] : [{ name: SITE_NAME }],
    creator: ownerName || SITE_NAME,
    publisher: SITE_NAME,
    category: 'real estate',
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: pageUrl,
    },
    robots: {
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
      locale: 'ka_GE',
      alternateLocale: ['en_US', 'ru_RU'],
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@vrgeorgia',
      title,
      description,
      images: primaryImage
        ? {
            url: primaryImage,
            alt: title,
            secureUrl: primaryImage.startsWith('https://') ? primaryImage : undefined,
          }
        : undefined,
    },
    other: {
      'apple-mobile-web-app-title': title,
      'application-name': SITE_NAME,
      'msapplication-TileColor': '#2563eb',
      'theme-color': '#2563eb',
    },
  };
}

export function buildDefaultShareMetadata(): Metadata {
  const title = `${SITE_NAME} — უძრავი ქონება საქართველოში`;
  const description =
    'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში. ვირტუალური ტურები და სანდო აგენტები.';

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      type: 'website',
      url: SITE_URL,
      title,
      description,
      siteName: SITE_NAME,
      locale: 'ka_GE',
      alternateLocale: ['en_US', 'ru_RU'],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@vrgeorgia',
      title,
      description,
    },
    other: {
      'application-name': SITE_NAME,
      'apple-mobile-web-app-title': SITE_NAME,
      'msapplication-TileColor': '#2563eb',
      'theme-color': '#2563eb',
    },
  };
}
