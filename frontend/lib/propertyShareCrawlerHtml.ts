import type { Property } from '@/lib/types';
import {
  buildDefaultShareMetadata,
  buildPropertyShareDescription,
  getPropertyShareImageUrl,
} from '@/lib/propertyShareMetadata';

const SITE_URL = 'https://vrgeorgia.ge';
const SITE_NAME = 'VR Georgia';

/** Social / messenger crawlers — middleware returns static HTML so OG tags are always in <head>. */
export const SOCIAL_CRAWLER_USER_AGENT =
  /facebookexternalhit|facebookcatalog|Facebot|Messenger|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Discordbot|Slackbot|SkypeUriPreview|meta-external|Pinterestbot|vkShare|Viber|Googlebot/i;

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
};

function buildShareCrawlerHtml({ title, description, pageUrl, image }: ShareCrawlerInput): string {
  const tags = [
    '<meta charset="utf-8"/>',
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}"/>`,
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
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  ${tags.join('\n  ')}
</head>
<body>
  <a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a>
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
  });
}

export function buildPropertyShareCrawlerHtml(id: string, property: Property | null): string {
  if (!property) {
    return buildDefaultShareCrawlerHtml();
  }

  const title = property.title?.trim() || 'განცხადება';
  const description = buildPropertyShareDescription(property);
  const pageUrl = `${SITE_URL}/property/${id}`;
  const image = getPropertyShareImageUrl(property);

  return buildShareCrawlerHtml({ title, description, pageUrl, image });
}
