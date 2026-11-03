import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canonicalPropertyPathId } from '@/lib/seoDuplicateCanonical';
import { fetchPropertyForShareMetadata } from '@/lib/propertyShareMetadata';
import {
  SOCIAL_CRAWLER_USER_AGENT,
  buildPropertyShareCrawlerHtml,
} from '@/lib/propertyShareCrawlerHtml';
import {
  DEFAULT_SITE_LANG,
  SITE_LANG_COOKIE,
  SITE_LANG_COOKIE_MAX_AGE,
  SITE_LANG_HEADER,
  langFromPathname,
  localizePath,
  normalizeSiteLang,
  stripLangPrefix,
  type SiteLang,
} from '@/lib/siteLang';

const IS_DEV = process.env.NODE_ENV !== 'production';

/* ------------------------------------------------------------------ */
/* Content-Security-Policy                                             */
/* ------------------------------------------------------------------ */

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Nonce-based CSP. `'strict-dynamic'` lets scripts injected by trusted
 * (nonced) scripts run — this is how Next.js loads its chunks — while blocking
 * everything else, including injected inline scripts (XSS).
 */
function buildCsp(nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Fallbacks for CSP2-only browsers that ignore strict-dynamic:
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    IS_DEV ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ');

  const connectSrc = ["'self'", 'https:', IS_DEV ? 'ws: wss: http://localhost:* http://127.0.0.1:*' : 'wss:']
    .filter(Boolean)
    .join(' ');

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:${IS_DEV ? ' http:' : ''}`,
    `font-src 'self' data: https:`,
    `media-src 'self' blob: https:`,
    `connect-src ${connectSrc}`,
    // 3D tours (superspl.at, YouTube, own tour viewer) are embedded in iframes.
    `frame-src 'self' https:${IS_DEV ? ' http://localhost:* http://127.0.0.1:*' : ''}`,
    `worker-src 'self' blob:`,
    `child-src 'self' blob: https:`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    IS_DEV ? '' : 'upgrade-insecure-requests',
  ].filter(Boolean);

  return directives.join('; ');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function applyLangCookie(res: NextResponse, lang: SiteLang, request: NextRequest) {
  const current = normalizeSiteLang(request.cookies.get(SITE_LANG_COOKIE)?.value);
  if (current === lang) return;
  res.cookies.set(SITE_LANG_COOKIE, lang, {
    path: '/',
    maxAge: SITE_LANG_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  });
}

/** True for same-origin client navigations / prefetches by the Next.js router. */
function isNextRouterRequest(request: NextRequest): boolean {
  return request.headers.has('next-router-prefetch') || request.headers.get('rsc') === '1';
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') ?? '';

  /* ---------- 1. Resolve language from URL prefix / cookie ---------- */
  const prefixLang = langFromPathname(pathname);
  const cookieLang = normalizeSiteLang(request.cookies.get(SITE_LANG_COOKIE)?.value);
  const cleanPath = stripLangPrefix(pathname);

  // Visitor explicitly chose EN/RU earlier (cookie) but opened an un-prefixed URL:
  // send them to the localized URL so language and URL stay in sync.
  // Bots never carry the cookie, so indexing is unaffected. Skipped for
  // router prefetches (they follow the redirect anyway) and for the social
  // crawler branch below.
  if (
    !prefixLang &&
    cookieLang &&
    cookieLang !== DEFAULT_SITE_LANG &&
    !isNextRouterRequest(request) &&
    !SOCIAL_CRAWLER_USER_AGENT.test(userAgent) &&
    request.method === 'GET'
  ) {
    const dest = request.nextUrl.clone();
    dest.pathname = localizePath(cleanPath, cookieLang);
    return NextResponse.redirect(dest, 307);
  }

  const lang: SiteLang = prefixLang ?? cookieLang ?? DEFAULT_SITE_LANG;

  /* ---------- 2. Request headers for server components ---------- */
  const nonce = makeNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', cleanPath);
  requestHeaders.set(SITE_LANG_HEADER, lang);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  /* ---------- 3. Social-media crawlers: static OG HTML for listings ---------- */
  const propertyMatch = cleanPath.match(/^\/property\/([^/]+)\/?$/);
  if (propertyMatch && SOCIAL_CRAWLER_USER_AGENT.test(userAgent)) {
    const id = decodeURIComponent(propertyMatch[1]);
    const property = await fetchPropertyForShareMetadata(id, lang);
    const canonicalId = property ? canonicalPropertyPathId(id, property) : '';
    if (property && canonicalId && canonicalId !== id) {
      const dest = request.nextUrl.clone();
      dest.pathname = localizePath(`/property/${canonicalId}`, lang);
      dest.search = '';
      return NextResponse.redirect(dest, 308);
    }
    const html = buildPropertyShareCrawlerHtml(id, property, lang);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Short cache so Meta/WhatsApp re-scrapes pick up OG fixes quickly
        'Cache-Control': 'public, max-age=60, must-revalidate',
        'Content-Security-Policy': csp,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy':
          'camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), browsing-topics=(), geolocation=(self)',
      },
    });
  }

  /* ---------- 4. Serve (rewrite away the language prefix) ---------- */
  let response: NextResponse;
  if (prefixLang) {
    const url = request.nextUrl.clone();
    url.pathname = cleanPath;
    url.search = search;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Content-Language', lang);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), browsing-topics=(), geolocation=(self)'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.append('Vary', 'Cookie');
  if (prefixLang) applyLangCookie(response, prefixLang, request);

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - Next internals (_next/static, _next/image, _next/data)
     * - API / backend proxies (api, uploads, v)
     * - static files with an extension in /public (icons, images, txt, xml, …)
     * - OG image routes
     */
    '/((?!_next/|api/|uploads/|v/|og/|.*\\.[A-Za-z0-9]{2,5}$).*)',
  ],
};
