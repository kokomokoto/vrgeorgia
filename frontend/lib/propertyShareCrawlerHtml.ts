import type { Property } from '@/lib/types';
import {
  buildDefaultShareMetadata,
  buildPropertyShareDescription,
  getPropertyOpenGraphImageUrl,
  getPropertyShareImageUrl,
} from '@/lib/propertyShareMetadata';
import { canonicalPropertyPathId } from '@/lib/seoDuplicateCanonical';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';
import {
  SITE_NAME,
  SITE_URL,
  buildPropertyJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';
import { DEFAULT_SITE_LANG, localizePath, ogLocale, type SiteLang } from '@/lib/siteLang';
import { SEO_WORDS, dealLabel as dealLabelI18n, typeLabel as typeLabelI18n } from '@/lib/seoI18n';

/**
 * Social / messenger preview bots only.
 * Search engines (Googlebot, Bingbot, etc.) must get the real Next.js page —
 * thin share HTML here would hurt indexing.
 */
export const SOCIAL_CRAWLER_USER_AGENT =
  /facebookexternalhit|facebookcatalog|Facebot|FacebookBot|Messenger|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Discordbot|Slackbot|SkypeUriPreview|meta-external|Pinterestbot|vkShare|Viber/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type ShareCrawlerInput = {
  title: string;
  description: string;
  pageUrl: string;
  image?: string;
  bodyHtml?: string;
  jsonLd?: unknown;
  lang?: SiteLang;
};

function buildShareCrawlerHtml({
  title,
  description,
  pageUrl,
  image,
  bodyHtml,
  jsonLd,
  lang = DEFAULT_SITE_LANG,
}: ShareCrawlerInput): string {
  const tags = [
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}"/>`,
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/>',
    '<meta property="og:type" content="website"/>',
    `<meta property="og:url" content="${escapeHtml(pageUrl)}"/>`,
    `<meta property="og:title" content="${escapeHtml(title)}"/>`,
    `<meta property="og:description" content="${escapeHtml(description)}"/>`,
    `<meta property="og:site_name" content="${SITE_NAME}"/>`,
    `<meta property="og:locale" content="${ogLocale(lang)}"/>`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}"/>` : '',
    image ? `<meta property="og:image:secure_url" content="${escapeHtml(image)}"/>` : '',
    image ? '<meta property="og:image:width" content="1200"/>' : '',
    image ? '<meta property="og:image:height" content="630"/>' : '',
    image ? '<meta property="og:image:type" content="image/jpeg"/>' : '',
    '<meta name="twitter:card" content="summary_large_image"/>',
    `<meta name="twitter:title" content="${escapeHtml(title)}"/>`,
    `<meta name="twitter:description" content="${escapeHtml(description)}"/>`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}"/>` : '',
    `<link rel="canonical" href="${escapeHtml(pageUrl)}"/>`,
    `<link rel="alternate" href="${escapeHtml(SITE_URL)}/llms.txt" type="text/plain" title="llms.txt"/>`,
  ].filter(Boolean);

  const jsonLdBlock = jsonLd
    ? `<script type="application/ld+json">${jsonLdScript(jsonLd)}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  ${tags.join('\n  ')}
  ${jsonLdBlock}
</head>
<body>
  ${bodyHtml || `<a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a>`}
</body>
</html>`;
}

function buildDefaultShareCrawlerHtml(lang: SiteLang): string {
  const meta = buildDefaultShareMetadata(lang);
  const path = DEFAULT_OG_IMAGE.url.startsWith('/')
    ? DEFAULT_OG_IMAGE.url
    : `/${DEFAULT_OG_IMAGE.url}`;
  return buildShareCrawlerHtml({
    title: typeof meta.title === 'string' ? meta.title : SITE_NAME,
    description: meta.description ?? '',
    pageUrl: `${SITE_URL}${localizePath('/', lang)}`,
    image: `${SITE_URL}${path}`,
    lang,
    bodyHtml: `
  <main>
    <h1>${escapeHtml(SITE_NAME)}</h1>
    <p>${escapeHtml(meta.description ?? '')}</p>
    <p><a href="${SITE_URL}">${SITE_URL}</a></p>
    <p><a href="${SITE_URL}/map">რუკა / Map</a> · <a href="${SITE_URL}/agents">აგენტები / Agents</a></p>
    <p><a href="${SITE_URL}/llms.txt">llms.txt</a> · <a href="${SITE_URL}/sitemap.xml">sitemap.xml</a></p>
  </main>`,
  });
}

function buildPropertyBodyHtml(
  id: string,
  property: Property,
  pageUrl: string,
  image: string | undefined,
  lang: SiteLang
): string {
  const title = property.title?.trim() || 'განცხადება';
  const typeLabel = typeLabelI18n(property.type, lang);
  const dealLabel = dealLabelI18n(property.dealType, lang, property.status);
  const address = getPropertyAddressLine(property);
  const { currencySymbol, totalPrice, pricePerSqm } = getPropertyPrices(property);
  const desc = (property.desc || '').trim();
  const facts: string[] = [];
  if (typeLabel) facts.push(typeLabel);
  if (dealLabel) facts.push(dealLabel);
  if (property.sqm) facts.push(`${property.sqm} ${SEO_WORDS.sqm[lang]}`);
  if (property.houseSqm) facts.push(`${typeLabelI18n('house', lang)} ${property.houseSqm} ${SEO_WORDS.sqm[lang]}`);
  if (property.rooms) facts.push(`${property.rooms} ${SEO_WORDS.rooms[lang]}`);
  if (property.bedrooms) facts.push(`${property.bedrooms} ${SEO_WORDS.bedrooms[lang]}`);
  if (property.floor) {
    facts.push(
      property.totalFloors
        ? `${SEO_WORDS.floor[lang]} ${property.floor}/${property.totalFloors}`
        : `${SEO_WORDS.floor[lang]} ${property.floor}`
    );
  }

  let priceLine = '';
  if (totalPrice != null) {
    priceLine = `${currencySymbol}${totalPrice.toLocaleString('en-US')}`;
    if (pricePerSqm != null) {
      priceLine += ` (${currencySymbol}${pricePerSqm.toLocaleString('en-US')}/მ²)`;
    }
  }

  return `
  <main>
    <article itemscope itemtype="https://schema.org/RealEstateListing">
      <h1 itemprop="name">${escapeHtml(title)}</h1>
      ${priceLine ? `<p><strong itemprop="offers" itemscope itemtype="https://schema.org/Offer"><span itemprop="price">${escapeHtml(priceLine)}</span></strong></p>` : ''}
      ${facts.length ? `<p>${escapeHtml(facts.join(' · '))}</p>` : ''}
      ${address ? `<p itemprop="address">${escapeHtml(address)}</p>` : ''}
      ${image ? `<p><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="1200" height="630" itemprop="image"/></p>` : ''}
      ${desc ? `<div itemprop="description"><p>${escapeHtml(desc).replace(/\n/g, '<br/>')}</p></div>` : ''}
      <p><a href="${escapeHtml(pageUrl)}" itemprop="url">${escapeHtml(SEO_WORDS.viewListing[lang])}</a></p>
      <p><a href="${SITE_URL}${localizePath('/', lang)}">${SITE_NAME}</a> · <a href="${SITE_URL}${localizePath('/map', lang)}">${escapeHtml(SEO_WORDS.map[lang])}</a> · <a href="${SITE_URL}/sitemap.xml">Sitemap</a></p>
    </article>
  </main>`;
}

export function buildPropertyShareCrawlerHtml(
  id: string,
  property: Property | null,
  lang: SiteLang = DEFAULT_SITE_LANG
): string {
  if (!property) {
    return buildDefaultShareCrawlerHtml(lang);
  }

  const title = property.title?.trim() || 'განცხადება';
  const description = buildPropertyShareDescription(property, lang);
  const pageUrl = `${SITE_URL}${localizePath(`/property/${canonicalPropertyPathId(id, property)}`, lang)}`;
  const image = getPropertyOpenGraphImageUrl(id, property);
  const bodyImage = getPropertyShareImageUrl(property) || image;

  return buildShareCrawlerHtml({
    title,
    description,
    pageUrl,
    image,
    lang,
    bodyHtml: buildPropertyBodyHtml(id, property, pageUrl, bodyImage, lang),
    jsonLd: buildPropertyJsonLd(id, property, lang),
  });
}
