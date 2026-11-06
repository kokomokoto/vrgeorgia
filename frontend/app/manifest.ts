import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vhome — უძრავი ქონება საქართველოში',
    short_name: 'Vhome',
    description:
      'ბინები, სახლები და კომერციული ფართები იყიდება და ქირავდება თბილისსა და საქართველოში — 3D ტურებით.',
    lang: 'ka',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    prefer_related_applications: false,
    related_applications: [
      { platform: 'webapp', url: `${getSiteUrl()}/manifest.webmanifest` },
    ],
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    categories: ['business', 'lifestyle', 'shopping'],
    icons: [
      { src: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
