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

const CLOUDINARY_SIZE: Record<Exclude<PropertyImageVariant, 'original'>, string> = {
  thumb: 'w_400,h_300,c_fill,f_auto,q_auto',
  large: 'w_1600,c_limit,f_auto,q_auto',
};

/**
 * ქვედა-მარცხენა კუთხე (g_south_west) — x/y თითოეული გამოსახულების საკუთარ კიდეებთანაა,
 * ამიტომ სხვადასხვა ასპექტის ფოტოზეც კუთხეს მიჰყვება, არა ეკრანის სტატიკურ წერტილს.
 */
const WATERMARK_LAYER: Record<Exclude<PropertyImageVariant, 'original'>, string> = {
  thumb: 'l_text:Arial_22_bold:vhome.ge,co_rgb:FFFFFF,o_55,g_south_west,x_12,y_10',
  large: 'l_text:Arial_44_bold:vhome.ge,co_rgb:FFFFFF,o_55,g_south_west,x_36,y_28',
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
 * გადმოწერის URL — large ვოთერმარკი + fl_attachment.
 * 360° აქ არ გადაეცემა.
 */
const WATERMARK_DOWNLOAD_TRANSFORM = `${CLOUDINARY_SIZE.large.replace(',f_auto', ',f_jpg')}/${WATERMARK_LAYER.large}/fl_attachment:vhome`;

export function cloudinaryWatermarkedDownloadUrl(path: string | null | undefined): string {
  const base = resolveBaseUrl(path);
  if (!base) return '';
  return applyCloudinaryTransform(base, WATERMARK_DOWNLOAD_TRANSFORM);
}

/**
 * ობიექტის ფოტოს URL — Cloudinary thumb/large.
 * ვოთერმარკი მხოლოდ options.watermark === true-ზე (განცხადების გვერდი).
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
  const size = CLOUDINARY_SIZE[variant];
  const transform =
    options?.watermark === true ? `${size}/${WATERMARK_LAYER[variant]}` : size;
  return applyCloudinaryTransform(base, transform);
}
