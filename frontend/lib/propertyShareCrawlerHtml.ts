import type { Property } from '@/lib/types';
import {
  buildDefaultShareMetadata,
  buildPropertyShareDescription,
  getPropertyShareImageUrl,
} from '@/lib/propertyShareMetadata';
import { getPropertyAddressLine, getPropertyPrices } from '@/lib/propertyDisplay';
import {
  SITE_NAME,
  SITE_URL,
  buildPropertyJsonLd,
  jsonLdScript,
  propertyDealLabel,
  propertyTypeLabel,
} from '@/lib/structuredData';

/**
 * Social messengers + search engines + AI crawlers.
 * Middleware returns static HTML so content/OG/JSON-LD is in the first response
 * (SPA client fetch is invisible to many bots).
 */
export const SOCIAL_CRAWLER_USER_AGENT =
  /facebookexternalhit|facebookcatalog|Facebot|Messenger|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Discordbot|Slackbot|SkypeUriPreview|meta-external|Pinterestbot|vkShare|Viber|Googlebot|Google-Extended|Bingbot|BingPreview|DuckDuckBot|Slurp|Yandex|Baiduspider|Applebot|GPTBot|ChatGPT-User|ClaudeBot|anthropic|PerplexityBot|Bytespider|CCBot|Amazonbot|cohere-ai|ia_archiver/i;

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
};

function buildShareCrawlerHtml({
  title,
  description,
  pageUrl,
  image,
  bodyHtml,
  jsonLd,
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
    '<meta property="og:locale" content="ka_GE"/>',
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
<html lang="ka">
<head>
  ${tags.join('\n  ')}
  ${jsonLdBlock}
</head>
<body>
  ${bodyHtml || `<a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a>`}
</body>
</html>`;
}

function buildDefaultShareCrawlerHtml(): string {
  const meta = buildDefaultShareMetadata();
  return buildShareCrawlerHtml({
    title: typeof meta.title === 'string' ? meta.title : SITE_NAME,
    description: meta.description ?? '',
    pageUrl: SITE_URL,
    image: undefined,
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

function buildPropertyBodyHtml(id: string, property: Property, pageUrl: string, image?: string): string {
  const title = property.title?.trim() || 'განცხადება';
  const typeLabel = propertyTypeLabel(property.type);
  const dealLabel = propertyDealLabel(property.dealType);
  const address = getPropertyAddressLine(property);
  const { currencySymbol, totalPrice, pricePerSqm } = getPropertyPrices(property);
  const desc = (property.desc || '').trim();
  const facts: string[] = [];
  if (typeLabel) facts.push(typeLabel);
  if (dealLabel) facts.push(dealLabel);
  if (property.sqm) facts.push(`${property.sqm} მ²`);
  if (property.houseSqm) facts.push(`სახლი ${property.houseSqm} მ²`);
  if (property.rooms) facts.push(`${property.rooms} ოთახი`);
  if (property.bedrooms) facts.push(`${property.bedrooms} საძინებელი`);
  if (property.floor) {
    facts.push(
      property.totalFloors
        ? `სართული ${property.floor}/${property.totalFloors}`
        : `სართული ${property.floor}`
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
      <p><a href="${escapeHtml(pageUrl)}" itemprop="url">განცხადების ნახვა / View listing</a></p>
      <p><a href="${SITE_URL}">${SITE_NAME}</a> · <a href="${SITE_URL}/map">რუკა</a> · <a href="${SITE_URL}/sitemap.xml">Sitemap</a></p>
    </article>
  </main>`;
}

export function buildPropertyShareCrawlerHtml(id: string, property: Property | null): string {
  if (!property) {
    return buildDefaultShareCrawlerHtml();
  }

  const title = property.title?.trim() || 'განცხადება';
  const description = buildPropertyShareDescription(property);
  const pageUrl = `${SITE_URL}/property/${id}`;
  const image = getPropertyShareImageUrl(property);

  return buildShareCrawlerHtml({
    title,
    description,
    pageUrl,
    image,
    bodyHtml: buildPropertyBodyHtml(id, property, pageUrl, image),
    jsonLd: buildPropertyJsonLd(id, property),
  });
}
