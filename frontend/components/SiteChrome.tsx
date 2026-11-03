'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useSitePathname } from '@/lib/useSitePathname';
import { DesignBranchBanner } from '@/components/DesignBranchBanner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  HomeDesignProvider,
  useHomeDesignOptional,
} from '@/components/home-design/HomeDesignContext';
import { ThemePaletteApplier } from '@/components/ThemePaletteApplier';
import type { HomeDesignLayout } from '@/lib/homeDesignLayout';

/**
 * Design Mode áƒ”áƒ“áƒ˜áƒ¢áƒáƒ áƒ˜ (~5.5k áƒ®áƒáƒ–áƒ˜) áƒ›áƒ®áƒáƒšáƒáƒ“ áƒáƒ“áƒ›áƒ˜áƒœáƒ¡ áƒ¡áƒ­áƒ˜áƒ áƒ“áƒ”áƒ‘áƒ áƒ“áƒ áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ›áƒáƒ¨áƒ˜áƒœ, áƒ áƒáƒªáƒ
 * áƒ áƒ”áƒŸáƒ˜áƒ›áƒ˜ áƒ©áƒáƒ áƒ—áƒ£áƒšáƒ˜áƒ â€” áƒªáƒáƒšáƒ™áƒ” chunk-áƒáƒ“ áƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ‘áƒ, áƒ áƒáƒ› áƒ©áƒ•áƒ”áƒ£áƒšáƒ”áƒ‘áƒ áƒ˜áƒ• áƒ•áƒ˜áƒ–áƒ˜áƒ¢áƒáƒ áƒ¡ áƒáƒ  áƒ’áƒáƒ”áƒ’áƒ–áƒáƒ•áƒœáƒáƒ¡.
 */
const DesignInspector = dynamic(
  () =>
    import('@/components/home-design/DesignInspector').then((m) => m.DesignInspector),
  { ssr: false }
);
const DesignSnapGuides = dynamic(
  () =>
    import('@/components/home-design/DesignSnapGuides').then((m) => m.DesignSnapGuides),
  { ssr: false }
);

/** áƒ”áƒ“áƒ˜áƒ¢áƒáƒ áƒ˜ áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ›áƒáƒ¨áƒ˜áƒœ áƒ áƒ”áƒœáƒ“áƒ”áƒ áƒ“áƒ”áƒ‘áƒ/áƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ‘áƒ, áƒ áƒáƒªáƒ áƒáƒ“áƒ›áƒ˜áƒœáƒ›áƒ Design Mode áƒ©áƒáƒ áƒ—áƒ */
function DesignModeTools() {
  const design = useHomeDesignOptional();
  if (!design?.designMode || !design.canDesignMode) return null;
  return (
    <>
      <DesignSnapGuides />
      <DesignInspector />
    </>
  );
}

/** áƒ¡áƒ áƒ£áƒšáƒ˜ áƒ”áƒ™áƒ áƒáƒœáƒ˜áƒ¡ áƒ áƒ”áƒŸáƒ˜áƒ›áƒ˜ â€” áƒ áƒ£áƒ™áƒáƒ–áƒ” áƒ«áƒ”áƒ‘áƒœáƒ (áƒ°áƒ”áƒ“áƒ”áƒ áƒ˜/áƒ¤áƒ£áƒ¢áƒ”áƒ áƒ˜ áƒáƒ  áƒ©áƒáƒœáƒ¡) */
export function isFullscreenMapRoute(pathname: string): boolean {
  return pathname === '/map' || pathname.startsWith('/map/');
}

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** áƒáƒ‘áƒ˜áƒ”áƒ¥áƒ¢áƒ˜áƒ¡ áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜ â€” áƒ˜áƒ’áƒ˜áƒ•áƒ” áƒ™áƒáƒœáƒ¢áƒ”áƒœáƒ¢áƒ˜áƒ¡ áƒ¡áƒ˜áƒ’áƒáƒœáƒ” áƒ áƒáƒª áƒ›áƒ—áƒáƒ•áƒáƒ  áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜áƒ¡ áƒ©áƒáƒ›áƒáƒœáƒáƒ—áƒ•áƒáƒšáƒ¡ */
function isPropertyRoute(pathname: string): boolean {
  return pathname === '/property' || pathname.startsWith('/property/');
}

/** áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜áƒ¡ áƒªáƒ”áƒœáƒ¢áƒ áƒ˜áƒ¡ áƒ¡áƒ˜áƒ’áƒáƒœáƒ” (map / typePanel / listings) â€” áƒ’áƒáƒ¡áƒ¬áƒáƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ©áƒáƒ áƒ©áƒ */
function useHomeCenterWidthPx(): number {
  const homeDesign = useHomeDesignOptional();
  const mapW = homeDesign?.layout.map.w ?? 1280;
  const listingsW = homeDesign?.layout.listings?.w ?? 1280;
  const typePanelW = homeDesign?.layout.typePanel.w ?? 1280;
  return Math.max(640, Math.round(Math.max(mapW, typePanelW, listingsW, 1280)));
}

/** áƒ©áƒáƒ›áƒáƒœáƒáƒ—áƒ•áƒáƒšáƒ˜áƒ¡ áƒ¡áƒ˜áƒ’áƒáƒœáƒ” â€” áƒáƒ‘áƒ˜áƒ”áƒ¥áƒ¢áƒ˜áƒ¡ áƒ›áƒáƒ¡áƒáƒšáƒ”áƒ‘áƒ˜ áƒáƒ› áƒ¡áƒ˜áƒ’áƒáƒœáƒ”áƒ–áƒ”, áƒªáƒ”áƒœáƒ¢áƒ áƒ˜áƒ¡ áƒ›áƒáƒ áƒªáƒ®áƒ”áƒœáƒ áƒ™áƒ˜áƒ“áƒ˜áƒ“áƒáƒœ */
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
    // áƒ˜áƒ’áƒ˜áƒ•áƒ” áƒ©áƒáƒ áƒ©áƒ áƒ áƒáƒª áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜áƒ¡ data-design-center + listings:
    // áƒªáƒ”áƒœáƒ¢áƒ áƒ˜ (áƒ›áƒáƒ’. 1296) mx-auto, áƒ¨áƒ˜áƒ’áƒœáƒ˜áƒ— áƒ©áƒáƒ›áƒáƒœáƒáƒ—áƒ•áƒáƒšáƒ˜áƒ¡ áƒ¡áƒ˜áƒ’áƒáƒœáƒ” (1280) áƒ›áƒáƒ áƒªáƒ®áƒœáƒ˜áƒ“áƒáƒœ â€”
    // áƒ›áƒáƒ áƒ¯áƒ•áƒ”áƒœáƒ áƒ™áƒ˜áƒ“áƒ” áƒ”áƒ›áƒ—áƒ®áƒ•áƒ”áƒ•áƒ áƒ°áƒáƒ£áƒ›áƒ˜áƒ¡ áƒ¥áƒáƒ áƒ“áƒ”áƒ‘áƒ¡ / KA-áƒ¡.
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
  const pathname = useSitePathname();
  const mapFullscreen = isFullscreenMapRoute(pathname);
  const adminPanel = isAdminRoute(pathname);
  const homePage = pathname === '/';
  const propertyPage = isPropertyRoute(pathname);

  if (mapFullscreen) {
    return (
      <HomeDesignProvider initialLayout={initialHomeDesign}>
        <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 dark:bg-zinc-950">{children}</div>
      </HomeDesignProvider>
    );
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
      {homePage ? <DesignModeTools /> : null}
    </HomeDesignProvider>
  );
}
