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
