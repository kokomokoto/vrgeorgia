'use client';

import React from 'react';
import { getApiBase } from '@/lib/config';
import { saveSiteBranding } from '@/lib/api';
import {
  DEFAULT_BRAND_LOGO_SRC,
  resolveBrandLogoSrc,
  type SiteBranding,
} from '@/lib/branding';

const DEFAULT_FAVICONS: { rel: string; href: string; type?: string; sizes?: string }[] = [
  { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
  { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
];

function applyDocumentFavicon(logoUrl: string) {
  if (typeof document === 'undefined') return;
  const head = document.head;
  const custom = String(logoUrl || '').trim();
  const iconLinks = Array.from(
    head.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    )
  ) as HTMLLinkElement[];

  if (custom) {
    for (const el of iconLinks) {
      if (!el.dataset.brandOriginalHref) {
        el.dataset.brandOriginalHref = el.getAttribute('href') || '';
      }
      el.href = custom;
      // Drop type/sizes so browser accepts remote image as tab icon
      el.removeAttribute('type');
      el.removeAttribute('sizes');
    }
    if (iconLinks.length === 0) {
      const link = document.createElement('link');
      link.setAttribute('data-brand-favicon', '1');
      link.rel = 'icon';
      link.href = custom;
      head.appendChild(link);
    }
    return;
  }

  for (const el of iconLinks) {
    const original = el.dataset.brandOriginalHref;
    if (original != null) {
      el.href = original;
      delete el.dataset.brandOriginalHref;
    }
  }
  head
    .querySelectorAll('link[data-brand-favicon]')
    .forEach((el) => el.parentElement?.removeChild(el));

  // Ensure static defaults exist after clearing a custom logo
  for (const fav of DEFAULT_FAVICONS) {
    const exists = head.querySelector(
      `link[rel="icon"][href="${fav.href}"]`
    );
    if (exists) continue;
    const link = document.createElement('link');
    link.rel = fav.rel;
    link.href = fav.href;
    if (fav.type) link.type = fav.type;
    if (fav.sizes) link.setAttribute('sizes', fav.sizes);
    head.appendChild(link);
  }
}

type BrandingContextValue = {
  /** გამოქვეყნებული (DB) */
  publishedLogoUrl: string;
  /** დრაფტი Design Mode-ში; null = დრაფტი არაა */
  draftLogoUrl: string | null;
  /** ეკრანზე ნაჩვენები (დრაფტი ან გამოქვეყნებული) */
  logoUrl: string;
  logoSrc: string;
  logoDirty: boolean;
  loaded: boolean;
  /** მხოლოდ ლოკალური დრაფტი — API არ იძახება */
  stageLogoUrl: (url: string) => void;
  discardLogoDraft: () => void;
  /** PUT + გამოქვეყნება + favicon */
  commitLogoDraft: () => Promise<void>;
  refreshBranding: () => Promise<void>;
};

const BrandingContext = React.createContext<BrandingContextValue>({
  publishedLogoUrl: '',
  draftLogoUrl: null,
  logoUrl: '',
  logoSrc: DEFAULT_BRAND_LOGO_SRC,
  logoDirty: false,
  loaded: false,
  stageLogoUrl: () => {},
  discardLogoDraft: () => {},
  commitLogoDraft: async () => {},
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [publishedLogoUrl, setPublishedLogoUrl] = React.useState('');
  const [draftLogoUrl, setDraftLogoUrl] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const applyPublished = React.useCallback((data: Partial<SiteBranding> | null | undefined) => {
    const next = String(data?.logoUrl || '').trim();
    setPublishedLogoUrl(next);
    setDraftLogoUrl(null);
    applyDocumentFavicon(next);
  }, []);

  const refreshBranding = React.useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/content/branding`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      applyPublished(data);
    } catch {
      /* keep current / default */
    } finally {
      setLoaded(true);
    }
  }, [applyPublished]);

  React.useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  const logoDirty = draftLogoUrl !== null;
  const logoUrl = logoDirty ? String(draftLogoUrl || '').trim() : publishedLogoUrl;
  const logoSrc = resolveBrandLogoSrc(logoUrl);

  const stageLogoUrl = React.useCallback((url: string) => {
    setDraftLogoUrl(String(url || '').trim());
  }, []);

  const discardLogoDraft = React.useCallback(() => {
    setDraftLogoUrl(null);
  }, []);

  const commitLogoDraft = React.useCallback(async () => {
    if (draftLogoUrl === null) return;
    const next = String(draftLogoUrl || '').trim();
    const saved = await saveSiteBranding({ logoUrl: next });
    const published = String(saved.logoUrl || '').trim();
    setPublishedLogoUrl(published);
    setDraftLogoUrl(null);
    applyDocumentFavicon(published);
  }, [draftLogoUrl]);

  const value = React.useMemo(
    () => ({
      publishedLogoUrl,
      draftLogoUrl,
      logoUrl,
      logoSrc,
      logoDirty,
      loaded,
      stageLogoUrl,
      discardLogoDraft,
      commitLogoDraft,
      refreshBranding,
    }),
    [
      publishedLogoUrl,
      draftLogoUrl,
      logoUrl,
      logoSrc,
      logoDirty,
      loaded,
      stageLogoUrl,
      discardLogoDraft,
      commitLogoDraft,
      refreshBranding,
    ]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return React.useContext(BrandingContext);
}
