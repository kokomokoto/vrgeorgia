import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'რუკა — უძრავი ქონების ძიება',
  description:
    'იპოვეთ უძრავი ქონება საქართველოში რუკაზე: ბინები, სახლები, მიწა და კომერციული ფართები.',
  alternates: { canonical: `${site}/map` },
  openGraph: {
    title: 'რუკა | Vhome',
    description: 'უძრავი ქონების ძიება რუკაზე საქართველოში.',
    url: `${site}/map`,
    siteName: 'Vhome',
    locale: 'ka_GE',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
