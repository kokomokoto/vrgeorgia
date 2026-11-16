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

/**
 * Fixed `f_webp` (not `f_auto`) so AVIF/WebP/JPG არ იქმნება ცალ-ცალკე
 * transformation-ებად და Cloudinary კრედიტი ნაკლებად იწურება.
 */
const CLOUDINARY_SIZE: Record<Exclude<PropertyImageVariant, 'original'>, string> = {
  thumb: 'w_400,h_300,c_fill,f_webp,q_auto',
  large: 'w_1600,c_limit,f_webp,q_auto',
};

/**
 * ქვედა-მარცხენა კუთხე (g_south_west) — x/y თითოეული გამოსახულების საკუთარ კიდეებთანაა,
 * ამიტომ სხვადასხვა ასპექტის ფოტოზეც კუთხეს მიჰყვება, არა ეკრანის სტატიკურ წერტილს.
 */
const WATERMARK_LAYER: Record<Exclude<PropertyImageVariant, 'original'>, string> = {
  thumb: 'l_text:Arial_22_bold:vhome.ge,co_rgb:FFFFFF,o_55,g_south_west,x_12,y_10',
  large: 'l_text:Arial_44_bold:vhome.ge,co_rgb:FFFFFF,o_55,g_south_west,x_36,y_28',
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

export function isR2MediaUrl(url: string): boolean {
  const base = r2PublicBase();
  return Boolean(base && url.startsWith(base));
}

/** Cloudflare Image Resizing URL (zone must have resizing enabled). */
export function applyCloudflareImageResize(absoluteUrl: string, options: string): string {
  const origin = cfImageOrigin();
  if (!origin || !absoluteUrl.startsWith('http')) return absoluteUrl;
  return `${origin}/cdn-cgi/image/${options}/${absoluteUrl}`;
}

/** არსებული Cloudinary transformation-ის ამოღება (master path) */
function stripCloudinaryTransforms(url: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  const [prefix, suffix] = url.split('/upload/');
  if (!suffix) return url;

  const segments = suffix.split('/');
  let startIdx = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (/^v\d+$/.test(seg)) break;
    if (seg.startsWith('vrgeorgia')) break;
    if (seg.includes(',') || (seg.includes('_') && !seg.includes('.'))) {
      startIdx = i + 1;
      continue;
    }
    break;
  }
  const cleanPath = segments.slice(startIdx).join('/');
  return `${prefix}/upload/${cleanPath}`;
}

export function applyCloudinaryTransform(url: string, transform: string): string {
  const base = stripCloudinaryTransforms(url);
  if (!base.includes('res.cloudinary.com') || !base.includes('/upload/')) {
    return base;
  }
  return base.replace('/upload/', `/upload/${transform}/`);
}

/**
 * გადმოწერის URL — large ვოთერმარკი + fl_attachment (Cloudinary).
 * R2-ზე ვოთერმარკი backend endpoint-ით მოგვიანებით.
 */
const WATERMARK_DOWNLOAD_TRANSFORM = `${CLOUDINARY_SIZE.large.replace(',f_webp', ',f_jpg')}/${WATERMARK_LAYER.large}/fl_attachment:vhome`;

export function cloudinaryWatermarkedDownloadUrl(path: string | null | undefined): string {
  const base = resolveBaseUrl(path);
  if (!base) return '';
  if (isR2MediaUrl(base)) return base;
  return applyCloudinaryTransform(base, WATERMARK_DOWNLOAD_TRANSFORM);
}

/**
 * Responsive `srcSet` for card thumbnails.
 * მხოლოდ 400 + 800 — 640 ამოვიღეთ, რომ ნაკლები unique transformation იყოს.
 */
export function propertyThumbSrcSet(
  path: string | null | undefined,
  options?: ResolvePropertyImageOptions
): string | undefined {
  const base = resolveBaseUrl(path);
  if (!base || options?.isPanorama) return undefined;

  if (isR2MediaUrl(base) && cfImageOrigin()) {
    return [400, 800]
      .map((w) => {
        const h = Math.round((w * 3) / 4);
        const opts = `width=${w},height=${h},fit=cover,format=webp,quality=80`;
        return `${applyCloudflareImageResize(base, opts)} ${w}w`;
      })
      .join(', ');
  }

  if (!base.includes('res.cloudinary.com')) return undefined;
  const widths = [400, 800];
  return widths
    .map((w) => {
      const h = Math.round((w * 3) / 4);
      const size = `w_${w},h_${h},c_fill,f_webp,q_auto`;
      const transform = options?.watermark === true ? `${size}/${WATERMARK_LAYER.thumb}` : size;
      return `${applyCloudinaryTransform(base, transform)} ${w}w`;
    })
    .join(', ');
}

/** Matching `sizes` for the listing grids (1 col mobile → 4 col desktop). */
export const PROPERTY_CARD_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 320px';

/**
 * ობიექტის ფოტოს URL — Cloudinary ან Cloudflare R2 + Image Resizing.
 * ვოთერმარკი მხოლოდ Cloudinary options.watermark === true-ზე (განცხადების გვერდი).
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

  if (isR2MediaUrl(base) && cfImageOrigin()) {
    return applyCloudflareImageResize(base, variant === 'thumb' ? CF_THUMB : CF_LARGE);
  }

  const size = CLOUDINARY_SIZE[variant];
  const transform =
    options?.watermark === true ? `${size}/${WATERMARK_LAYER[variant]}` : size;
  return applyCloudinaryTransform(base, transform);
}
