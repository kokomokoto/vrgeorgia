import type { Property } from '@/lib/types';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';
import { getPropertyShareImageUrl } from '@/lib/propertyShareMetadata';

export const SITE_URL = 'https://vrgeorgia.ge';
export const SITE_NAME = 'VR Georgia';
export const SITE_API = 'https://vrgeorgia-api.onrender.com';

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

export function propertyTypeLabel(type?: string): string {
  if (!type) return '';
  return TYPE_LABELS[type] || type;
}

export function propertyDealLabel(dealType?: string): string {
  if (!dealType) return DEAL_LABELS.sale;
  return DEAL_LABELS[dealType] || dealType;
}

/** Organization + WebSite — მთავარი გვერდისთვის */
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.ico`,
        description:
          'უძრავი ქონება საქართველოში — ბინები, სახლები, კომერციული ფართები, მიწა. ვირტუალური ტურები და აგენტები.',
        areaServed: {
          '@type': 'Country',
          name: 'Georgia',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: ['ka', 'en', 'ru'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/map?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

/** RealEstateListing JSON-LD ერთი განცხადებისთვის */
export function buildPropertyJsonLd(id: string, property: Property) {
  const title = property.title?.trim() || 'განცხადება';
  const pageUrl = `${SITE_URL}/property/${id}`;
  const address = getPropertyAddressLine(property);
  const { totalPrice } = getPropertyPrices(property);
  const image = getPropertyShareImageUrl(property);
  const currency = property.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  const typeLabel = propertyTypeLabel(property.type);
  const dealLabel = propertyDealLabel(property.dealType);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': pageUrl,
    name: title,
    url: pageUrl,
    description:
      (property.desc || '').trim().slice(0, 5000) ||
      `${dealLabel} ${typeLabel}${address ? ` — ${address}` : ''}`.trim(),
    datePosted: property.createdAt || undefined,
    inLanguage: 'ka',
    category: typeLabel || undefined,
    accommodationCategory: typeLabel || undefined,
  };

  if (image) jsonLd.image = [image];

  if (address || property.city) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress: property.street || undefined,
      addressLocality: property.city || undefined,
      addressRegion: property.region || undefined,
      addressCountry: 'GE',
    };
  }

  if (
    property.location &&
    Number.isFinite(property.location.lat) &&
    Number.isFinite(property.location.lng)
  ) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: property.location.lat,
      longitude: property.location.lng,
    };
  }

  if (totalPrice != null && totalPrice > 0) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: totalPrice,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url: pageUrl,
    };
  }

  if (property.sqm && property.sqm > 0) {
    jsonLd.floorSize = {
      '@type': 'QuantitativeValue',
      value: property.sqm,
      unitCode: 'MTK',
    };
  }

  if (property.rooms && property.rooms > 0) {
    jsonLd.numberOfRooms = property.rooms;
  }

  return jsonLd;
}

export function buildFaqPageJsonLd(
  items: { question: string; answer: string }[],
  pageUrl = `${SITE_URL}/faq`
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': pageUrl,
    url: pageUrl,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  crumbs: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function buildAboutPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE_URL}/about`,
    url: `${SITE_URL}/about`,
    name: 'VR Georgia-ს შესახებ',
    description:
      'VR Georgia — უძრავი ქონების პლატფორმა საქართველოში ვირტუალური ტურებით, რუკით და აგენტებით.',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
