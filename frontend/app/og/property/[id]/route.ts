import { NextResponse } from 'next/server';
import {
  fetchPropertyForShareMetadata,
  getPropertyShareImageUrl,
} from '@/lib/propertyShareMetadata';
import { DEFAULT_OG_IMAGE } from '@/lib/seoDefaults';
import { getSiteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';
export const revalidate = 3600;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function fallbackImageUrl(): string {
  const path = DEFAULT_OG_IMAGE.url.startsWith('/')
    ? DEFAULT_OG_IMAGE.url
    : `/${DEFAULT_OG_IMAGE.url}`;
  return `${getSiteUrl()}${path}`;
}

/**
 * Same-origin OG image for Facebook/WhatsApp/Messenger.
 * Path is /og/... (not /api/...) because next.config rewrites /api/* to the Express backend.
 * Cloudinary URLs often fail Meta preview (blank image) even when HTML meta is correct.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const property = await fetchPropertyForShareMetadata(id);
  const remote = property ? getPropertyShareImageUrl(property) : undefined;
  const sourceUrl = remote || fallbackImageUrl();

  try {
    const upstream = await fetch(sourceUrl, {
      headers: { Accept: 'image/jpeg,image/*,*/*' },
      next: { revalidate: 3600 },
    });
    if (!upstream.ok) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType.includes('image') ? contentType : 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Length': String(body.byteLength),
      },
    });
  } catch {
    return new NextResponse('Image fetch failed', { status: 502 });
  }
}
