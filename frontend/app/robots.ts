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

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  if (isNoIndexHost()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      host: site,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
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
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
