import imageCompression from 'browser-image-compression';

/** ჩვეულებრივი ფოტო — ბრაუზერში შეკუმშვის ლიმიტი */
export const REGULAR_PHOTO_MAX_MB = 0.5;
export const REGULAR_PHOTO_MAX_DIMENSION = 2560;

/**
 * ჩვეულებრივი ფოტოს შეკუმშვა ატვირთვამდე (360° უცვლელად რჩება).
 */
export async function compressPhotoForUpload(file: File, isPanorama: boolean): Promise<File> {
  if (isPanorama) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: REGULAR_PHOTO_MAX_MB,
      maxWidthOrHeight: REGULAR_PHOTO_MAX_DIMENSION,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.82,
      preserveExif: false,
    });
    return compressed;
  } catch {
    return file;
  }
}

/** ფოტოების მასიური მომზადება ატვირთვამდე */
export async function preparePhotosForUpload(
  files: File[],
  panoramaFlags: boolean[],
  onProgress?: (done: number, total: number) => void
): Promise<File[]> {
  const prepared: File[] = [];
  for (let i = 0; i < files.length; i++) {
    prepared.push(await compressPhotoForUpload(files[i], Boolean(panoramaFlags[i])));
    onProgress?.(i + 1, files.length);
  }
  return prepared;
}
