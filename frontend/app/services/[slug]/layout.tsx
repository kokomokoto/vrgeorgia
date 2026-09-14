import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE, SERVICE_SEO } from '@/lib/seoDefaults';
import { isServiceSectionId } from '@/lib/servicesCatalog';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const site = getSiteUrl();
  const seo = isServiceSectionId(slug) ? SERVICE_SEO[slug] : null;
  const title = seo?.title || 'სერვისი';
  const description =
    seo?.description || 'არქიტექტურული და უძრავი ქონების სერვისები — Vhome.';
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
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

export default function ServiceDetailLayout({ children }: LayoutProps) {
  return children;
}
