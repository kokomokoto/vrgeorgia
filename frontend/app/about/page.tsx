import type { Metadata } from 'next';
import { SITE_URL, buildAboutPageJsonLd, jsonLdScript } from '@/lib/structuredData';
import { AboutPageClient } from '@/components/AboutPageClient';

export const metadata: Metadata = {
  title: 'საიტის შესახებ',
  description:
    'რა არის VR Georgia: უძრავი ქონების ძიება საქართველოში, რუკა, აგენტები და ვირტუალური ტურები.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'VR Georgia-ს შესახებ',
    description: 'უძრავი ქონების პლატფორმა საქართველოში — ძიება, რუკა, VR ტურები, აგენტები.',
    url: `${SITE_URL}/about`,
    siteName: 'VR Georgia',
    locale: 'ka_GE',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildAboutPageJsonLd()) }}
      />
      <AboutPageClient />
    </>
  );
}
