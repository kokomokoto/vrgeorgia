import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

const site = getSiteUrl();

export const metadata: Metadata = {
  alternates: { canonical: site },
  openGraph: {
    url: site,
    images: [DEFAULT_OG_IMAGE],
  },
};

/** Homepage-only SEO (client page.tsx cannot export metadata). */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
