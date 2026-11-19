import { getApiBase } from './config';

export type PropertyImageVariant = 'thumb' | 'large' | 'original';

export type ResolvePropertyImageOptions = {
  isPanorama?: boolean;
  /**
   * ნაგულისხმევად false (მთავარი/სია სუფთა).
   * განცხადების გვერდზე გადაეცით true — მარჯვენა კლიკითაც ვოთერმარკიანი ფაილი ჩამოდის.
   */
  watermark?: boolean;
};

const CF_THUMB = 'width=400,height=300,fit=cover,format=webp,quality=80';
const CF_LARGE = 'width=1600,fit=scale-down,format=webp,quality=80';

function resolveBaseUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getApiBase()}${path}`;
}

function r2PublicBase(): string {
  return (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

function cfImageOrigin(): string {
  return (process.env.NEXT_PUBLIC_CF_IMAGE_ORIGIN || '').replace(/\/$/, '');
}

/** Opt-in: CF Image Transformations free/quota plans return 429 and break galleries. */
function cfImageResizeEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_CF_IMAGE_RESIZE || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function isR2MediaUrl(url: string): boolean {
  const base = r2PublicBase();
  return Boolean(base && url.startsWith(base));
}

/**
 * Cloudflare Image Resizing URL.
 * Disabled unless NEXT_PUBLIC_CF_IMAGE_RESIZE=1 — otherwise return the original
 * media.vhome.ge URL (R2 public).
 */
export function applyCloudflareImageResize(absoluteUrl: string, options: string): string {
  if (!cfImageResizeEnabled()) return absoluteUrl;
  const origin = cfImageOrigin();
  if (!origin || !absoluteUrl.startsWith('http')) return absoluteUrl;
  return `${origin}/cdn-cgi/image/${options}/${absoluteUrl}`;
}

/** @deprecated — Cloudinary removed; returns URL unchanged. */
export function applyCloudinaryTransform(url: string, _transform?: string): string {
  return url;
}

function watermarkedUrl(absoluteUrl: string, download = false): string {
  const q = new URLSearchParams({ url: absoluteUrl });
  if (download) q.set('download', '1');
  return `${getApiBase()}/api/media/watermarked?${q.toString()}`;
}

/** გადმოწერის URL — backend sharp watermark (R2). */
export function cloudinaryWatermarkedDownloadUrl(path: string | null | undefined): string {
  const base = resolveBaseUrl(path);
  if (!base) return '';
  if (!base.startsWith('http')) return base;
  return watermarkedUrl(base, true);
}

/**
 * Responsive `srcSet` for card thumbnails (optional CF resize).
 */
export function propertyThumbSrcSet(
  path: string | null | undefined,
  options?: ResolvePropertyImageOptions
): string | undefined {
  const base = resolveBaseUrl(path);
  if (!base || options?.isPanorama) return undefined;

  if (isR2MediaUrl(base) && cfImageResizeEnabled() && cfImageOrigin()) {
    return [400, 800]
      .map((w) => {
        const h = Math.round((w * 3) / 4);
        const opts = `width=${w},height=${h},fit=cover,format=webp,quality=80`;
        return `${applyCloudflareImageResize(base, opts)} ${w}w`;
      })
      .join(', ');
  }

  return undefined;
}

/** Matching `sizes` for the listing grids (1 col mobile → 4 col desktop). */
export const PROPERTY_CARD_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 320px';

/**
 * ობიექტის ფოტოს URL — Cloudflare R2 (+ optional Image Resizing).
 * watermark: true → backend sharp overlay.
 * 360° / original — სუფთა master.
 */
export function resolvePropertyImageUrl(
  path: string | null | undefined,
  variant: PropertyImageVariant = 'original',
  options?: ResolvePropertyImageOptions
): string {
  const base = resolveBaseUrl(path);
  if (!base || options?.isPanorama || variant === 'original') {
    return base;
  }

  if (options?.watermark === true && base.startsWith('http')) {
    return watermarkedUrl(base, false);
  }

  if (isR2MediaUrl(base) && cfImageResizeEnabled() && cfImageOrigin()) {
    return applyCloudflareImageResize(base, variant === 'thumb' ? CF_THUMB : CF_LARGE);
  }

  return base;
}
