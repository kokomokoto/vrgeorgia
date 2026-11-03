import type { MetadataRoute } from 'next';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';

const PRIVATE_PATHS = [
  '/admin/',
  '/login',
  '/register',
  '/profile',
  '/upload',
  '/favorites',
  '/compare',
  '/messages',
  '/analytics',
  '/property/*/edit',
];

const BOTS = [
  '*',
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Applebot',
  'CCBot',
  'Amazonbot',
] as const;

const SOCIAL_BOTS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'meta-externalagent',
  'meta-externalfetcher',
  'FacebookBot',
  'LinkedInBot',
  'TelegramBot',
  'Twitterbot',
  'Discordbot',
  'Slackbot',
  'Viber',
] as const;

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  if (isNoIndexHost()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: [
      ...BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: [...PRIVATE_PATHS],
      })),
      ...SOCIAL_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
      })),
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
