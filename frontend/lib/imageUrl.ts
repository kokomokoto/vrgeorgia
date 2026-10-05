import { getApiBase } from './config';

export type PropertyImageVariant = 'thumb' | 'large' | 'original';

const CLOUDINARY_TRANSFORMS: Record<Exclude<PropertyImageVariant, 'original'>, string> = {
  thumb: 'w_400,h_300,c_fill,f_auto,q_auto',
  large: 'w_1600,c_limit,f_auto,q_auto',
};

function resolveBaseUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getApiBase()}${path}`;
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
 * გადმოწერის URL. ორიგინალი სუფთა რჩება — Cloudinary ტექსტს მხოლოდ ამ მოთხოვნაზე დებს.
 * 360° აქ არ გადაეცემა.
 */
const WATERMARK_DOWNLOAD_TRANSFORM =
  'w_1600,c_limit,q_auto,f_jpg/l_text:Arial_64_bold:vhome.ge,co_white,o_55,a_-22,g_center/fl_attachment:vhome';

export function cloudinaryWatermarkedDownloadUrl(path: string | null | undefined): string {
  const base = resolveBaseUrl(path);
  if (!base) return '';
  return applyCloudinaryTransform(base, WATERMARK_DOWNLOAD_TRANSFORM);
}

/**
 * ობიექტის ფოტოს URL — Cloudinary-ზე thumb/large AVIF (f_auto).
 * 360° პანორამა უცვლელ master URL-ით (viewer ცალკე ამუშავებს).
 */
export function resolvePropertyImageUrl(
  path: string | null | undefined,
  variant: PropertyImageVariant = 'original',
  options?: { isPanorama?: boolean }
): string {
  const base = resolveBaseUrl(path);
  if (!base || options?.isPanorama || variant === 'original') {
    return base;
  }
  return applyCloudinaryTransform(base, CLOUDINARY_TRANSFORMS[variant]);
}
