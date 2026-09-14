import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

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
  return children;
}
