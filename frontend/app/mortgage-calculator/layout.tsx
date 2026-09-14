import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';

const site = getSiteUrl();

export const metadata: Metadata = {
  title: 'იპოთეკის კალკულატორი',
  description:
    'გამოთვალეთ იპოთეკის ყოველთვიური გადასახადი, პროცენტი და სესხის ჯამი — Vhome იპოთეკის კალკულატორი.',
  alternates: { canonical: `${site}/mortgage-calculator` },
  openGraph: {
    title: 'იპოთეკის კალკულატორი | Vhome',
    description: 'იპოთეკის ყოველთვიური გადასახადის გამოთვლა საქართველოში.',
    url: `${site}/mortgage-calculator`,
    siteName: 'Vhome',
    locale: 'ka_GE',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function MortgageCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
