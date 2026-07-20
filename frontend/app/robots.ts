import type { MetadataRoute } from 'next';

const PRIVATE_PATHS = [
  '/admin/',
  '/login',
  '/profile',
  '/upload',
  '/favorites',
  '/compare',
  '/messages',
  '/analytics',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // AI / search crawlers — explicit allow for public content discovery
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Applebot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: 'Facebot',
        allow: '/',
      },
      {
        userAgent: 'meta-externalagent',
        allow: '/',
      },
      {
        userAgent: 'meta-externalfetcher',
        allow: '/',
      },
    ],
    sitemap: 'https://vrgeorgia.ge/sitemap.xml',
    host: 'https://vrgeorgia.ge',
  };
}
