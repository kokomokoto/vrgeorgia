import './globals-client';
import '@/styles/globals.css';

import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';
import { CompareProvider } from '@/components/CompareProvider';
import { PageTracker } from '@/components/PageTracker';

export const metadata: Metadata = {
  title: {
    default: 'VR Georgia — უძრავი ქონება საქართველოში',
    template: '%s | VR Georgia'
  },
  description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში. ვირტუალური ტურები, დეტალური ფილტრები და სანდო აგენტები.',
  keywords: ['უძრავი ქონება', 'საქართველო', 'ბინა', 'სახლი', 'იყიდება', 'ქირავდება', 'VR Georgia', 'real estate', 'Georgia', 'Tbilisi'],
  authors: [{ name: 'VR Georgia' }],
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    url: 'https://vrgeorgia.ge',
    siteName: 'VR Georgia',
    title: 'VR Georgia — უძრავი ქონება საქართველოში',
    description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VR Georgia — უძრავი ქონება საქართველოში',
    description: 'იპოვეთ სახლი, ბინა, კომერციული ფართი და მიწის ნაკვეთი საქართველოში.',
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL('https://vrgeorgia.ge'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <CompareProvider>
            <PageTracker />
            <Header />
            <main className="mx-auto max-w-6xl px-2 sm:px-4 py-4 sm:py-6">{children}</main>
            <Footer />
          </CompareProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
