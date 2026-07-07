/** equirectangular პანორამა ჩვეულებრივ 2:1 (არა 16:9 ≈ 1.78) */
export function isEquirectangularAspect(width: number, height: number): boolean {
  if (!width || !height || height < 400) return false;
  const ratio = width / height;
  return ratio >= 1.92 && ratio <= 2.08;
}

/** URL-ის ნორმალიზაცია შედარებისთვის (Cloudinary query პარამეტრების გარეშე) */
export function normalizePhotoUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      return `${u.origin}${u.pathname}`.toLowerCase();
    } catch {
      return trimmed.toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}

export function isPanoramaPhoto(url: string, panoramaPhotos?: string[] | null): boolean {
  if (!url || !panoramaPhotos?.length) return false;
  const key = normalizePhotoUrl(url);
  return panoramaPhotos.some((p) => p === url || normalizePhotoUrl(p) === key);
}

/**
 * 360° viewer-ისთვის URL-ები (პირველი = ოპტიმალური ზომა WebGL-ისთვის).
 */
export function getPanoramaViewerUrls(src: string): string[] {
  if (!src) return [];
  const out: string[] = [];
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    out.push(src.replace('/upload/', '/upload/w_2048,h_1024,c_limit,f_jpg,q_auto:good/'));
    out.push(src.replace('/upload/', '/upload/w_4096,h_2048,c_limit,f_jpg,q_auto:good/'));
    out.push(src.replace('/upload/', '/upload/w_3072,h_1536,c_limit,f_jpg,q_auto:good/'));
    out.push(src.replace('/upload/', '/upload/f_jpg,q_auto:good/'));
  }
  if (!out.includes(src)) out.push(src);
  return [...new Set(out)];
}

/** ფაილის ზომების წაკითხვა ატვირთვამდე */
export function detectPanoramaFromFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(isEquirectangularAspect(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    img.src = objectUrl;
  });
}
