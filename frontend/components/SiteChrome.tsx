'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/** სრული ეკრანის რეჟიმი — რუკაზე ძებნა (ჰედერი/ფუტერი არ ჩანს) */
export function isFullscreenMapRoute(pathname: string): boolean {
  return pathname === '/map' || pathname.startsWith('/map/');
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mapFullscreen = isFullscreenMapRoute(pathname);

  if (mapFullscreen) {
    return <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 dark:bg-zinc-950">{children}</div>;
  }

  return (
    <>
      <Header />
      <main className="relative z-0 mx-auto w-full min-h-[50vh] max-w-7xl flex-1 px-2 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
