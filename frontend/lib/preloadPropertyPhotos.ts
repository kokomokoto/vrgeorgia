import { resolvePropertyImageUrl, type PropertyImageVariant } from './imageUrl';
import { isPanoramaPhoto } from './panorama';

function galleryVariant(photo: string, panoramaPhotos?: string[]): PropertyImageVariant {
  return isPanoramaPhoto(photo, panoramaPhotos) ? 'original' : 'large';
}

export function resolveGalleryPhotoUrl(photo: string, panoramaPhotos?: string[]): string {
  const variant = galleryVariant(photo, panoramaPhotos);
  return resolvePropertyImageUrl(photo, variant, {
    isPanorama: variant === 'original',
  });
}

export function preloadImageUrl(url: string): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** ობიექტის გვერდი — ყველა ფოტო (large/360) წინასწარ, მთავარი პირველ რიგში */
export async function preloadPropertyGalleryPhotos(
  photos: string[],
  panoramaPhotos?: string[],
  mainIndex = 0
): Promise<void> {
  if (!photos.length) return;

  const safeMain = Math.min(Math.max(0, mainIndex), photos.length - 1);
  await preloadImageUrl(resolveGalleryPhotoUrl(photos[safeMain], panoramaPhotos));

  const rest = photos.filter((_, i) => i !== safeMain);
  await Promise.all(
    rest.map((photo) => preloadImageUrl(resolveGalleryPhotoUrl(photo, panoramaPhotos)))
  );
}

export function startPropertyGalleryPreload(
  photos: string[],
  panoramaPhotos?: string[],
  mainIndex = 0,
  onPhotoLoaded?: (photo: string) => void
): () => void {
  if (!photos.length) return () => {};

  let cancelled = false;
  const safeMain = Math.min(Math.max(0, mainIndex), photos.length - 1);

  const load = (photo: string) => {
    const url = resolveGalleryPhotoUrl(photo, panoramaPhotos);
    const img = new Image();
    const done = () => {
      if (!cancelled) onPhotoLoaded?.(photo);
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
  };

  load(photos[safeMain]);
  photos.forEach((photo, i) => {
    if (i !== safeMain) load(photo);
  });

  return () => {
    cancelled = true;
  };
}
