import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchPropertyForShareMetadata } from '@/lib/propertyShareMetadata';
import {
  SOCIAL_CRAWLER_USER_AGENT,
  buildPropertyShareCrawlerHtml,
} from '@/lib/propertyShareCrawlerHtml';

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (!SOCIAL_CRAWLER_USER_AGENT.test(userAgent)) {
    return NextResponse.next();
  }

  const match = request.nextUrl.pathname.match(/^\/property\/([^/]+)\/?$/);
  if (!match) {
    return NextResponse.next();
  }

  const id = decodeURIComponent(match[1]);
  const property = await fetchPropertyForShareMetadata(id);
  const html = buildPropertyShareCrawlerHtml(id, property);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  });
}

export const config = {
  matcher: '/property/:path*',
};
