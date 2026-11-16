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
 * მხოლოდ ერთი ტრანსფორმი + original fallback — 3–4 ზომა კრედიტს ჭამდა.
 */
export function getPanoramaViewerUrls(src: string): string[] {
  if (!src) return [];
  const out: string[] = [];
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    out.push(src.replace('/upload/', '/upload/w_2048,h_1024,c_limit,f_jpg,q_auto:good/'));
  } else {
    const origin = (process.env.NEXT_PUBLIC_CF_IMAGE_ORIGIN || '').replace(/\/$/, '');
    const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    if (origin && r2Base && src.startsWith(r2Base)) {
      out.push(`${origin}/cdn-cgi/image/width=2048,height=1024,fit=scale-down,format=jpg,quality=80/${src}`);
    }
  }
  if (!out.includes(src)) out.push(src);
  return [...new Set(out)];
}

/** ერთი ფაილის ზომების წაკითხვის ჭერი — დეკოდირება შეიძლება არასდროს დასრულდეს */
const DETECT_TIMEOUT_MS = 10_000;

/**
 * ფაილის ზომების წაკითხვა ატვირთვამდე.
 *
 * ტაიმაუტი აუცილებელია: დიდი სურათის დეკოდირებამ შეიძლება არც `onload` და არც
 * `onerror` არ გამოიძახოს (მეხსიერების ნაკლებობა), და ატვირთვა უსასრულოდ ჩაიჭედება.
 */
export function detectPanoramaFromFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(false), DETECT_TIMEOUT_MS);

    img.onload = () => finish(isEquirectangularAspect(img.naturalWidth, img.naturalHeight));
    img.onerror = () => finish(false);
    img.src = objectUrl;
  });
}

/** ერთდროულად დეკოდირებული სურათების ჭერი — 16 პარალელური დეკოდი ტაბს ახრჩობს */
const DETECT_CONCURRENCY = 3;

/**
 * პანორამის ამოცნობა ბევრ ფაილზე შეზღუდული პარალელიზმით.
 * `Promise.all` ყველა ფაილზე ერთდროულად სუსტ მოწყობილობაზე ბრაუზერს აგდებდა.
 */
export async function detectPanoramaFlags(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<boolean[]> {
  const flags = new Array<boolean>(files.length).fill(false);
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < files.length) {
      const index = cursor;
      cursor += 1;
      flags[index] = await detectPanoramaFromFile(files[index]);
      done += 1;
      onProgress?.(done, files.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(DETECT_CONCURRENCY, files.length) }, () => worker())
  );

  return flags;
}
