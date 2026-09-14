import type { Metadata } from 'next';
import { SITE_URL, buildAboutPageJsonLd, jsonLdScript } from '@/lib/structuredData';
import { AboutPageClient } from '@/components/AboutPageClient';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

export const metadata: Metadata = {
  title: 'საიტის შესახებ',
  description:
    'რა არის Vhome: უძრავი ქონების ძიება საქართველოში, რუკა, აგენტები და ვირტუალური ტურები.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'Vhome-ს შესახებ',
    description: 'უძრავი ქონების პლატფორმა საქართველოში — ძიება, რუკა, VR ტურები, აგენტები.',
    url: `${SITE_URL}/about`,
    siteName: 'Vhome',
    locale: 'ka_GE',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
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
