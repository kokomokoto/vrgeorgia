import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE, SERVICE_SEO } from '@/lib/seoDefaults';
import { isServiceSectionId } from '@/lib/servicesCatalog';
import {
  SITE_URL,
  buildBreadcrumbJsonLd,
  buildServiceJsonLd,
  jsonLdScript,
} from '@/lib/structuredData';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const site = getSiteUrl();
  const seo = SERVICE_SEO[slug];
  const known = isServiceSectionId(slug) || Boolean(seo);
  const title = seo?.title || 'მომსახურება';
  const description =
    seo?.description || 'Vhome-ის არქიტექტურული და დიზაინის მომსახურებები.';
  const url = `${site}/services/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Vhome`,
      description,
      url,
      siteName: 'Vhome',
      locale: 'ka_GE',
      type: 'website',
      images: known ? [DEFAULT_OG_IMAGE] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ServiceDetailLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const seo = SERVICE_SEO[slug];
  const title = seo?.title || 'სერვისი';
  const description = seo?.description || '';
  const pageUrl = `${SITE_URL}/services/${slug}`;
  const jsonLdBlocks = [
    buildServiceJsonLd(slug, title, description),
    buildBreadcrumbJsonLd([
      { name: 'მთავარი', url: SITE_URL },
      { name: 'სერვისები', url: `${SITE_URL}/services` },
      { name: title, url: pageUrl },
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
