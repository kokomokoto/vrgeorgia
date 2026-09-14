import './globals.css';

import type { Metadata } from 'next';
import { PageTracker } from '@/components/PageTracker';
import { SiteChrome } from '@/components/SiteChrome';
import { buildOrganizationJsonLd, jsonLdScript } from '@/lib/structuredData';
import { fetchHomeDesignLayoutServer } from '@/lib/fetchHomeDesignServer';
import { getSiteUrl, isNoIndexHost } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { Providers } from './providers';

const siteUrl = getSiteUrl();
const noIndex = isNoIndexHost();

export const metadata: Metadata = {
  title: {
    default: 'Vhome — უძრავი ქონება საქართველოში',
    template: '%s | Vhome'
  },
  description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში. ვირტუალური ტურები, დეტალური ფილტრები და სანდო აგენტები.',
  keywords: ['უძრავი ქონება', 'საქართველო', 'ბინა', 'სახლი', 'იყიდება', 'ქირავდება', 'Vhome', 'real estate', 'Georgia', 'Tbilisi'],
  authors: [{ name: 'Vhome' }],
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    url: siteUrl,
    siteName: 'Vhome',
    title: 'Vhome — უძრავი ქონება საქართველოში',
    description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში.',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vhome — უძრავი ქონება საქართველოში',
    description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში.',
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: noIndex
    ? { index: false, follow: false }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
  // Absolute URLs for OG/Twitter; per-route layouts set their own canonical (do not pin homepage here).
  metadataBase: new URL(siteUrl),
};

const orgJsonLd = buildOrganizationJsonLd();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialHomeDesign = await fetchHomeDesignLayoutServer();

  return (
    <html lang="ka" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
        <meta name="theme-color" content="#22c55e" />
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
            <SiteChrome initialHomeDesign={initialHomeDesign}>{children}</SiteChrome>
          </div>
        </Providers>
      </body>
    </html>
  );
}
