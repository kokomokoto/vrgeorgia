/**
 * Site language routing helpers — shared by middleware, server components and client code.
 *
 * URL scheme:
 *   /…        → Georgian (default, no prefix)
 *   /en/…     → English
 *   /ru/…     → Russian
 *
 * Middleware strips the prefix (rewrite) and forwards the language in the
 * `x-site-lang` request header; a `vh_lang` cookie carries the visitor's choice
 * for un-prefixed URLs so server and client always render the same language.
 */

export const SITE_LANGS = ['ka', 'en', 'ru'] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

export const DEFAULT_SITE_LANG: SiteLang = 'ka';
/** Languages that live under a URL prefix (everything except the default). */
export const PREFIXED_SITE_LANGS: readonly SiteLang[] = ['en', 'ru'];

export const SITE_LANG_HEADER = 'x-site-lang';
export const SITE_LANG_COOKIE = 'vh_lang';
export const SITE_LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const PREFIX_RE = /^\/(en|ru)(?=\/|$)/i;

export function isSiteLang(value: unknown): value is SiteLang {
  return typeof value === 'string' && (SITE_LANGS as readonly string[]).includes(value);
}

/** `en-US` → `en`; anything unsupported → null. */
export function normalizeSiteLang(value: string | null | undefined): SiteLang | null {
  const base = String(value || '')
    .trim()
    .split(/[-_,;]/)[0]
    .toLowerCase();
  return isSiteLang(base) ? base : null;
}

/** Language encoded in the URL prefix, or null when there is none. */
export function langFromPathname(pathname: string): SiteLang | null {
  const m = pathname.match(PREFIX_RE);
  return m ? (m[1].toLowerCase() as SiteLang) : null;
}

/** `/en/property/x` → `/property/x`; `/en` → `/`; un-prefixed paths unchanged. */
export function stripLangPrefix(pathname: string): string {
  if (!PREFIX_RE.test(pathname)) return pathname || '/';
  const stripped = pathname.replace(PREFIX_RE, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/** Add the language prefix for en/ru; Georgian stays un-prefixed. Accepts paths with or without a prefix. */
export function localizePath(pathname: string, lang: SiteLang): string {
  const clean = stripLangPrefix(pathname || '/');
  if (lang === DEFAULT_SITE_LANG) return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

/** BCP-47 value for `<html lang>`. */
export function htmlLang(lang: SiteLang): string {
  return lang;
}

/** Open Graph locale. */
export function ogLocale(lang: SiteLang): string {
  if (lang === 'en') return 'en_US';
  if (lang === 'ru') return 'ru_RU';
  return 'ka_GE';
}

/** Intl locale for dates / numbers. */
export function intlLocale(lang: SiteLang): string {
  if (lang === 'en') return 'en-GB';
  if (lang === 'ru') return 'ru-RU';
  return 'ka-GE';
}

/** Read the language cookie from a raw `Cookie` header / `document.cookie` string. */
export function langFromCookieString(cookie: string | null | undefined): SiteLang | null {
  if (!cookie) return null;
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SITE_LANG_COOKIE}=([^;]+)`));
  return m ? normalizeSiteLang(decodeURIComponent(m[1])) : null;
}

/** Persist the chosen language for the server (cookie) — client only. */
export function writeLangCookie(lang: SiteLang): void {
  if (typeof document === 'undefined') return;
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${SITE_LANG_COOKIE}=${lang}; Path=/; Max-Age=${SITE_LANG_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}
