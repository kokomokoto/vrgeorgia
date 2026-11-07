import './globals.css';

import type { Metadata, Viewport } from 'next';
import { PageTracker } from '@/components/PageTracker';
import { SiteChrome } from '@/components/SiteChrome';
import { SiteAnalytics } from '@/components/SiteAnalytics';
import { buildOrganizationJsonLd, jsonLdScript } from '@/lib/structuredData';
import { fetchHomeDesignLayoutServer } from '@/lib/fetchHomeDesignServer';
import { getSiteUrl, isNoIndexHost, SITE_NAME } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getRequestLang, getRequestNonce, loadLocaleBundleServer } from '@/lib/serverLang';
import { SITE_META } from '@/lib/seoI18n';
import { localizePath, ogLocale, SITE_LANGS } from '@/lib/siteLang';
import { Providers } from './providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  userScalable: true,
};

const siteUrl = getSiteUrl();
const noIndex = isNoIndexHost();

const KEYWORDS = {
  ka: [
    'უძრავი ქონება',
    'ბინები თბილისში',
    'ბინა იყიდება თბილისში',
    'ბინა ქირავდება თბილისში',
    'სახლი იყიდება',
    'კომერციული ფართი',
    'მიწის ნაკვეთი',
    '3D ტური',
    'Vhome',
    'real estate Georgia',
    'apartments Tbilisi',
  ],
  en: [
    'real estate Georgia',
    'apartments for sale Tbilisi',
    'apartments for rent Tbilisi',
    'houses for sale Georgia',
    'property Batumi',
    '3D virtual tours',
    'Vhome',
  ],
  ru: [
    'недвижимость Грузия',
    'купить квартиру Тбилиси',
    'аренда квартиры Тбилиси',
    'дом в Грузии',
    'недвижимость Батуми',
    '3D-туры',
    'Vhome',
  ],
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const meta = SITE_META[lang];
  return {
    title: {
      default: meta.title,
      template: `%s | ${SITE_NAME}`,
    },
    description: meta.description,
    keywords: [...KEYWORDS[lang]],
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
    category: 'real estate',
    formatDetection: { telephone: true, email: true, address: true },
    openGraph: {
      type: 'website',
      locale: ogLocale(lang),
      alternateLocale: SITE_LANGS.filter((l) => l !== lang).map(ogLocale),
      url: `${siteUrl}${localizePath('/', lang)}`,
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@vhome',
      title: meta.title,
      description: meta.description,
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
            'max-video-preview': -1,
          },
        },
    // Absolute URLs for OG/Twitter; per-route layouts set their own canonical + hreflang.
    metadataBase: new URL(siteUrl),
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
    other: {
      'msapplication-TileColor': '#0b0f19',
    },
  };
}

const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var k='vr-theme';var s=localStorage.getItem(k);if(s==='dark'){d.classList.add('dark');d.classList.remove('twilight');}else if(s==='twilight'){d.classList.remove('dark');d.classList.add('twilight');}else if(s==='light'){d.classList.remove('dark');d.classList.remove('twilight');}var t=localStorage.getItem('token');var u=localStorage.getItem('user');if(t){d.setAttribute('data-vr-auth','1');if(u){try{var r=JSON.parse(u).role;if(r)d.setAttribute('data-vr-role',String(r));}catch(e){}}}else{d.removeAttribute('data-vr-auth');d.removeAttribute('data-vr-role');}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, nonce, initialHomeDesign] = await Promise.all([
    getRequestLang(),
    getRequestNonce(),
    fetchHomeDesignLayoutServer(),
  ]);
  const initialResources = await loadLocaleBundleServer(lang);
  const orgJsonLd = buildOrganizationJsonLd(lang, initialHomeDesign?.socialLinks ?? null);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#22c55e" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLdScript(orgJsonLd) }}
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen">
        <Providers initialLang={lang} initialResources={initialResources}>
          <div className="relative flex min-h-screen flex-col">
            <PageTracker />
            <SiteChrome initialHomeDesign={initialHomeDesign}>{children}</SiteChrome>
          </div>
        </Providers>
        <SiteAnalytics nonce={nonce} />
      </body>
    </html>
  );
}
