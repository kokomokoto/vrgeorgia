'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DesignBranchBanner } from '@/components/DesignBranchBanner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  HomeDesignProvider,
  useHomeDesignOptional,
} from '@/components/home-design/HomeDesignContext';
import { DesignInspector } from '@/components/home-design/DesignInspector';
import { DesignSnapGuides } from '@/components/home-design/DesignSnapGuides';
import { ThemePaletteApplier } from '@/components/ThemePaletteApplier';
import type { HomeDesignLayout } from '@/lib/homeDesignLayout';

/** სრული ეკრანის რეჟიმი — რუკაზე ძებნა (ჰედერი/ფუტერი არ ჩანს) */
export function isFullscreenMapRoute(pathname: string): boolean {
  return pathname === '/map' || pathname.startsWith('/map/');
}

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** ობიექტის გვერდი — იგივე კონტენტის სიგანე რაც მთავარ გვერდის ჩამონათვალს */
function isPropertyRoute(pathname: string): boolean {
  return pathname === '/property' || pathname.startsWith('/property/');
}

/** მთავარი გვერდის ცენტრის სიგანე (map / typePanel / listings) — გასწორების ჩარჩო */
function useHomeCenterWidthPx(): number {
  const homeDesign = useHomeDesignOptional();
  const mapW = homeDesign?.layout.map.w ?? 1280;
  const listingsW = homeDesign?.layout.listings?.w ?? 1280;
  const typePanelW = homeDesign?.layout.typePanel.w ?? 1280;
  return Math.max(640, Math.round(Math.max(mapW, typePanelW, listingsW, 1280)));
}

/** ჩამონათვალის სიგანე — ობიექტის მასალები ამ სიგანეზე, ცენტრის მარცხენა კიდიდან */
function useHomeListingsWidthPx(): number {
  const homeDesign = useHomeDesignOptional();
  const listingsW = homeDesign?.layout.listings?.w ?? 1280;
  return Math.max(640, Math.round(listingsW) || 1280);
}

function SiteMain({
  children,
  adminPanel,
  homePage,
  propertyPage,
}: {
  children: React.ReactNode;
  adminPanel: boolean;
  homePage: boolean;
  propertyPage: boolean;
}) {
  const centerMaxPx = useHomeCenterWidthPx();
  const listingsMaxPx = useHomeListingsWidthPx();

  if (adminPanel) {
    return (
      <main className="relative z-0 w-full min-h-[50vh] flex-1 p-0">{children}</main>
    );
  }

  if (homePage) {
    return (
      <main className="relative z-0 w-full min-h-[50vh] flex-1 overflow-x-hidden p-0">
        {children}
      </main>
    );
  }

  if (propertyPage) {
    // იგივე ჩარჩო რაც მთავარის data-design-center + listings:
    // ცენტრი (მაგ. 1296) mx-auto, შიგნით ჩამონათვალის სიგანე (1280) მარცხნიდან —
    // მარჯვენა კიდე ემთხვევა ჰოუმის ქარდებს / KA-ს.
    return (
      <main className="relative z-0 w-full min-h-[50vh] flex-1 px-3 py-4 sm:px-0 sm:py-6">
        <div
          className="relative mx-auto w-full max-w-[var(--site-center-w)]"
          style={{ '--site-center-w': `${centerMaxPx}px` } as React.CSSProperties}
        >
          <div
            className="w-full max-w-[var(--site-content-w)]"
            style={{ '--site-content-w': `${listingsMaxPx}px` } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="relative z-0 mx-auto w-full min-h-[50vh] max-w-7xl flex-1 px-2 py-4 sm:px-4 sm:py-6">
      {children}
    </main>
  );
}

export function SiteChrome({
  children,
  initialHomeDesign = null,
}: {
  children: React.ReactNode;
  initialHomeDesign?: HomeDesignLayout | null;
}) {
  const pathname = usePathname();
  const mapFullscreen = isFullscreenMapRoute(pathname);
  const adminPanel = isAdminRoute(pathname);
  const homePage = pathname === '/';
  const propertyPage = isPropertyRoute(pathname);

  if (mapFullscreen) {
    return <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 dark:bg-zinc-950">{children}</div>;
  }

  return (
    <HomeDesignProvider initialLayout={initialHomeDesign}>
      <ThemePaletteApplier />
      <DesignBranchBanner />
      {!adminPanel && <Header />}
      <SiteMain adminPanel={adminPanel} homePage={homePage} propertyPage={propertyPage}>
        {children}
      </SiteMain>
      {!adminPanel && <Footer />}
      {homePage ? (
        <>
          <DesignSnapGuides />
          <DesignInspector />
        </>
      ) : null}
    </HomeDesignProvider>
  );
}
