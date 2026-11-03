'use client';

import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SITE_LANG, langFromPathname, localizePath, normalizeSiteLang, stripLangPrefix, type SiteLang } from '@/lib/siteLang';

/**
 * Pathname without the `/en` / `/ru` language prefix.
 * The middleware rewrites prefixed URLs, but `usePathname()` still returns the
 * browser URL — route checks (`pathname === '/'`) must use this instead.
 */
export function useSitePathname(): string {
  const pathname = usePathname() || '/';
  return stripLangPrefix(pathname);
}

/** Language currently encoded in the URL (null for un-prefixed Georgian URLs). */
export function useUrlLang(): SiteLang | null {
  const pathname = usePathname() || '/';
  return langFromPathname(pathname);
}

/**
 * Current UI language → href localizer for internal links so navigation keeps
 * the visitor on the `/en` / `/ru` tree (no redirect hop, consistent hreflang).
 */
export function useLocalizeHref(): (href: string) => string {
  const { i18n } = useTranslation();
  const lang = normalizeSiteLang(i18n.language) ?? DEFAULT_SITE_LANG;
  return (href: string) => localizeHref(href, lang);
}

/** Localize an internal href (path + optional query/hash); external URLs untouched. */
export function localizeHref(href: string, lang: SiteLang): string {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return href;
  // Never prefix backend / static routes
  if (/^\/(api|uploads|v|og|_next|images|sitemap\.xml|robots\.txt|llms\.txt|manifest\.webmanifest)(\/|$)/.test(href)) {
    return href;
  }
  const m = href.match(/^([^?#]*)(.*)$/);
  const path = m?.[1] || '/';
  const rest = m?.[2] || '';
  return `${localizePath(path, lang)}${rest}`;
}
