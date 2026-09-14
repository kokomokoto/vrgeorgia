import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'აგენტები',
  description: 'უძრავი ქონების აგენტები საქართველოში — პროფილები და განცხადებები.',
  alternates: { canonical: `${site}/agents` },
  openGraph: {
    title: 'აგენტები | Vhome',
    description: 'იპოვეთ სანდო უძრავი ქონების აგენტები საქართველოში.',
    url: `${site}/agents`,
    siteName: 'Vhome',
    locale: 'ka_GE',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
