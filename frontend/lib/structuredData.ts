import type { Property } from '@/lib/types';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';
import {
  absoluteListingImageUrl,
  buildPropertyDocumentTitle,
  getPropertyShareImageUrl,
} from '@/lib/propertyShareMetadata';
import { SITE_NAME, getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_SITE_LANG, localizePath, type SiteLang } from '@/lib/siteLang';
import { SITE_META, dealLabel as dealLabelI18n, typeLabel as typeLabelI18n } from '@/lib/seoI18n';
import { applyCloudinaryTransform } from '@/lib/imageUrl';
import { SITE_CONTACT, buildSameAs } from '@/lib/siteContact';
import type { SiteSocialLinks } from '@/lib/siteSocialLinks';

export { SITE_NAME };
export const SITE_URL = getSiteUrl();
export const SITE_API = 'https://vrgeorgia-api.onrender.com';

export function propertyTypeLabel(type?: string, lang: SiteLang = DEFAULT_SITE_LANG): string {
  return typeLabelI18n(type, lang);
}

export function propertyDealLabel(
  dealType?: string,
  status?: Property['status'],
  lang: SiteLang = DEFAULT_SITE_LANG
): string {
  return dealLabelI18n(dealType || 'sale', lang, status);
}

/** Organization + WebSite — მთავარი გვერდისთვის (sameAs, contactPoint, address — EEAT) */
export function buildOrganizationJsonLd(
  lang: SiteLang = DEFAULT_SITE_LANG,
  socialLinks?: SiteSocialLinks | null
) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'RealEstateAgent'],
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        legalName: SITE_CONTACT.legalName,
        alternateName: ['Vhome.ge', 'Virtual Home Georgia', 'VR Georgia'],
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          '@id': `${SITE_URL}/#logo`,
          url: `${SITE_URL}/images/vhome-icon.png`,
          contentUrl: `${SITE_URL}/images/vhome-icon.png`,
          width: 512,
          height: 512,
          caption: SITE_NAME,
        },
        image: { '@id': `${SITE_URL}/#logo` },
        description: SITE_META[lang].description,
        foundingDate: SITE_CONTACT.foundingDate,
        email: SITE_CONTACT.email,
        telephone: SITE_CONTACT.phoneE164,
        address: {
          '@type': 'PostalAddress',
          addressLocality: SITE_CONTACT.city,
          addressRegion: SITE_CONTACT.region,
          addressCountry: 'GE',
        },
        areaServed: {
          '@type': 'Country',
          name: 'Georgia',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            telephone: SITE_CONTACT.phoneE164,
            email: SITE_CONTACT.email,
            availableLanguage: ['Georgian', 'English', 'Russian'],
            areaServed: 'GE',
          },
        ],
        sameAs: buildSameAs(socialLinks),
        knowsAbout: [
          'Real estate in Georgia',
          'Apartments for sale in Tbilisi',
          'Apartments for rent in Tbilisi',
          '3D virtual property tours',
          'Gaussian splatting',
        ],
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

/** First available 3D / VR tour URL on the listing. */
export function propertyTourUrl(property: Property): string | undefined {
  const candidates = [property.tourLink, property.exteriorLink, property.interiorLink, property.threeDLink];
  for (const c of candidates) {
    const v = String(c || '').trim();
    if (/^https?:\/\//i.test(v)) return v;
  }
  return undefined;
}

/** Does the listing have any 3D / VR / 360 media? */
export function propertyHas3d(property: Property): boolean {
  return Boolean(propertyTourUrl(property) || (property.panoramaPhotos?.length ?? 0) > 0);
}

/** RealEstateListing JSON-LD ერთი განცხადებისთვის */
export function buildPropertyJsonLd(id: string, property: Property, lang: SiteLang = DEFAULT_SITE_LANG) {
  const title = buildPropertyDocumentTitle(property, lang);
  const path = `/property/${property.urlKey || property.canonicalId || property._id || id}`;
  const pageUrl = `${SITE_URL}${localizePath(path, lang)}`;
  const address = getPropertyAddressLine(property);
  const { totalPrice } = getPropertyPrices(property);
  const image = getPropertyShareImageUrl(property);
  const currency = property.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  const typeLabel = propertyTypeLabel(property.type, lang);
  const dealLabel = propertyDealLabel(property.dealType, property.status, lang);
  const tourUrl = propertyTourUrl(property);

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
    inLanguage: lang,
    category: typeLabel || undefined,
    accommodationCategory: typeLabel || undefined,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    provider: { '@id': `${SITE_URL}/#organization` },
  };

  const gallery = (property.photos || [])
    .slice(0, 12)
    .map((p) => absoluteListingImageUrl(p))
    .filter((u): u is string => Boolean(u))
    .map((u) => (u.includes('res.cloudinary.com') ? applyCloudinaryTransform(u, 'w_1600,c_limit,f_jpg,q_auto') : u));
  if (image || gallery.length) {
    jsonLd.image = [...new Set([image, ...gallery].filter((u): u is string => Boolean(u)))];
  }

  if (tourUrl) {
    jsonLd.tourBookingPage = tourUrl;
    jsonLd.subjectOf = {
      '@type': 'VideoObject',
      '@id': `${pageUrl}#tour`,
      name: `${title} — 3D tour`,
      description: lang === 'ka' ? 'ინტერაქტიული 3D ტური' : lang === 'ru' ? 'Интерактивный 3D-тур' : 'Interactive 3D tour',
      embedUrl: tourUrl,
      thumbnailUrl: image ? [image] : undefined,
      uploadDate: property.createdAt || undefined,
    };
  }

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

export function buildAboutPageJsonLd(lang: SiteLang = DEFAULT_SITE_LANG) {
  const path = localizePath('/about', lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE_URL}${path}`,
    url: `${SITE_URL}${path}`,
    name: SITE_META[lang].shortTitle,
    description: SITE_META[lang].description,
    inLanguage: lang,
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

/** ItemList of listings for hub / landing / collection pages. */
export function buildListingItemListJsonLd(
  pageUrl: string,
  name: string,
  properties: Property[],
  lang: SiteLang = DEFAULT_SITE_LANG
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#listings`,
    name,
    url: pageUrl,
    numberOfItems: properties.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: properties.map((p, i) => {
      const path = `/property/${p.urlKey || p._id}`;
      const url = `${SITE_URL}${localizePath(path, lang)}`;
      const { totalPrice } = getPropertyPrices(p);
      const image = getPropertyShareImageUrl(p);
      return {
        '@type': 'ListItem',
        position: i + 1,
        url,
        item: {
          '@type': 'RealEstateListing',
          '@id': url,
          url,
          name: buildPropertyDocumentTitle(p, lang),
          ...(image ? { image } : {}),
          ...(totalPrice
            ? {
                offers: {
                  '@type': 'Offer',
                  price: totalPrice,
                  priceCurrency: p.priceCurrency === 'GEL' ? 'GEL' : 'USD',
                },
              }
            : {}),
        },
      };
    }),
  };
}

/** CollectionPage wrapper for landing pages. */
export function buildCollectionPageJsonLd(input: {
  url: string;
  name: string;
  description: string;
  lang: SiteLang;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: input.lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
