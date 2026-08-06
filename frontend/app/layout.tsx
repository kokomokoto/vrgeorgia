import './globals.css';

import type { Metadata } from 'next';
import { PageTracker } from '@/components/PageTracker';
import { SiteChrome } from '@/components/SiteChrome';
import { buildOrganizationJsonLd, jsonLdScript } from '@/lib/structuredData';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'VR Georgia — უძრავი ქონება საქართველოში',
    template: '%s | VR Georgia'
  },
  description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში. ვირტუალური ტურები, დეტალური ფილტრები და სანდო აგენტები.',
  keywords: ['უძრავი ქონება', 'საქართველო', 'ბინა', 'სახლი', 'იყიდება', 'ქირავდება', 'VR Georgia', 'real estate', 'Georgia', 'Tbilisi'],
  authors: [{ name: 'VR Georgia' }],
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    url: 'https://vrgeorgia.ge',
    siteName: 'VR Georgia',
    title: 'VR Georgia — უძრავი ქონება საქართველოში',
    description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VR Georgia — უძრავი ქონება საქართველოში',
    description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL('https://vrgeorgia.ge'),
  alternates: {
    canonical: 'https://vrgeorgia.ge',
  },
};

const orgJsonLd = buildOrganizationJsonLd();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(orgJsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='vr-theme';var s=localStorage.getItem(k);var d=document.documentElement;if(s==='dark'){d.classList.add('dark');d.classList.remove('twilight');}else if(s==='twilight'){d.classList.remove('dark');d.classList.add('twilight');}else if(s==='light'){d.classList.remove('dark');d.classList.remove('twilight');}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <PageTracker />
            <SiteChrome>{children}</SiteChrome>
          </div>
        </Providers>
      </body>
    </html>
  );
}
