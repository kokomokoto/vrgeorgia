import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canonicalPropertyPathId } from '@/lib/seoDuplicateCanonical';
import { fetchPropertyForShareMetadata } from '@/lib/propertyShareMetadata';
import {
  SOCIAL_CRAWLER_USER_AGENT,
  buildPropertyShareCrawlerHtml,
} from '@/lib/propertyShareCrawlerHtml';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const userAgent = request.headers.get('user-agent') ?? '';
  if (!SOCIAL_CRAWLER_USER_AGENT.test(userAgent)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const match = request.nextUrl.pathname.match(/^\/property\/([^/]+)\/?$/);
  if (!match) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const id = decodeURIComponent(match[1]);
  const property = await fetchPropertyForShareMetadata(id);
  const canonicalId = property ? canonicalPropertyPathId(id, property) : '';
  if (property && canonicalId && canonicalId !== id) {
    const dest = request.nextUrl.clone();
    dest.pathname = `/property/${canonicalId}`;
    dest.search = '';
    return NextResponse.redirect(dest, 308);
  }
  const html = buildPropertyShareCrawlerHtml(id, property);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Short cache so Meta/WhatsApp re-scrapes pick up OG fixes quickly
      'Cache-Control': 'public, max-age=60, must-revalidate',
    },
  });
}

export const config = {
  matcher: '/property/:path*',
};
