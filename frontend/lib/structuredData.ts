import type { Property } from '@/lib/types';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';
import { getPropertyShareImageUrl } from '@/lib/propertyShareMetadata';
import { SITE_NAME, getSiteUrl } from '@/lib/siteUrl';

export { SITE_NAME };
export const SITE_URL = getSiteUrl();
export const SITE_API = 'https://vrgeorgia-api.onrender.com';

const DEAL_LABELS: Record<string, string> = {
  sale: 'იყიდება',
  rent: 'ქირავდება',
  mortgage: 'გირავდება',
};

const DEAL_SOLD_LABELS: Record<string, string> = {
  sale: 'გაიყიდა',
  rent: 'გაქირავდა',
  mortgage: 'გირავნობით გაიცა',
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

export function propertyDealLabel(dealType?: string, status?: Property['status']): string {
  const map = status === 'sold' ? DEAL_SOLD_LABELS : DEAL_LABELS;
  if (!dealType) return map.sale;
  return map[dealType] || dealType;
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
        logo: `${SITE_URL}/images/vhome-icon.png`,
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
  const dealLabel = propertyDealLabel(property.dealType, property.status);

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
      availability:
        property.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
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
    name: 'Vhome-ს შესახებ',
    description:
      'Vhome — უძრავი ქონების პლატფორმა საქართველოში ვირტუალური ტურებით, რუკით და აგენტებით.',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };
}

export function buildAgentJsonLd(agent: {
  _id: string;
  name?: string;
  photo?: string;
  company?: string;
  bio?: { ka?: string };
  areas?: string[];
  avgRating?: number;
  totalReviews?: number;
  phone?: string;
  email?: string;
}) {
  const pageUrl = `${SITE_URL}/agents/${agent._id}`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${pageUrl}#agent`,
    name: agent.name || 'აგენტი',
    url: pageUrl,
    image: agent.photo || undefined,
    worksFor: agent.company
      ? { '@type': 'Organization', name: agent.company }
      : { '@id': `${SITE_URL}/#organization` },
    description: agent.bio?.ka || undefined,
    areaServed: (agent.areas || []).length
      ? agent.areas!.map((a) => ({ '@type': 'Place', name: a }))
      : { '@type': 'Country', name: 'Georgia' },
    telephone: agent.phone || undefined,
    email: agent.email || undefined,
  };
  if (agent.avgRating && agent.totalReviews && agent.totalReviews > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: agent.avgRating,
      reviewCount: agent.totalReviews,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return data;
}

export function buildServiceJsonLd(slug: string, title: string, description: string) {
  const pageUrl = `${SITE_URL}/services/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${pageUrl}#service`,
    name: title,
    description,
    url: pageUrl,
    provider: { '@id': `${SITE_URL}/#organization` },
    areaServed: { '@type': 'Country', name: 'Georgia' },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
