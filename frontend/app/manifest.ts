import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Vhome — უძრავი ქონება საქართველოში',
    short_name: 'Vhome',
    description:
      'ბინები, სახლები და კომერციული ფართები იყიდება და ქირავდება თბილისსა და საქართველოში — 3D ტურებით.',
    lang: 'ka',
    // Stable 200 response. A redirect on the launch URL keeps Android's splash up.
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    categories: ['business', 'lifestyle', 'shopping'],
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
