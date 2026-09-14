import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE, SERVICE_SEO } from '@/lib/seoDefaults';
import {
  SITE_URL,
  buildBreadcrumbJsonLd,
  buildServiceJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'სერვისები',
  description:
    'არქიტექტურა, ინტერიერი, დოკუმენტაცია და სხვა სერვისები უძრავი ქონებისთვის — Vhome.',
  alternates: { canonical: `${site}/services` },
  openGraph: {
    title: 'სერვისები | Vhome',
    description: 'არქიტექტურული და უძრავი ქონების სერვისები.',
    url: `${site}/services`,
    siteName: 'Vhome',
    locale: 'ka_GE',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  const jsonLdBlocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/services#page`,
      url: `${SITE_URL}/services`,
      name: 'სერვისები',
      description:
        'არქიტექტურა, ინტერიერი, დოკუმენტაცია და სხვა სერვისები უძრავი ქონებისთვის — Vhome.',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      hasPart: Object.entries(SERVICE_SEO).map(([slug, seo]) =>
        buildServiceJsonLd(slug, seo.title, seo.description)
      ),
    },
    buildBreadcrumbJsonLd([
      { name: 'მთავარი', url: SITE_URL },
      { name: 'სერვისები', url: `${SITE_URL}/services` },
    ]),
  ];

  return (
    <>
      {jsonLdBlocks.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
        />
      ))}
      {children}
    </>
  );
}
