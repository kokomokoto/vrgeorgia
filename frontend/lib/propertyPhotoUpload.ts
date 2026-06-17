import { addPropertyPhotos } from './api';

/** ერთ მოთხოვნაში — RAM/timeout-ის თავიდან ასაცილებლად (Render + Cloudinary) */
export const PROPERTY_PHOTO_BATCH_SIZE = 4;

const BATCH_PAUSE_MS = 400;

export type PhotoUploadProgress = {
  uploaded: number;
  total: number;
  batchIndex: number;
  batchCount: number;
};

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ფოტოები პაკეტებად ატვირთავს არსებულ ობიექტზე (თანმიმდევრობა ინარჩუნება).
 */
export async function uploadPropertyPhotosInBatches(
  propertyId: string,
  files: File[],
  panoramaFlags: boolean[],
  onProgress?: (progress: PhotoUploadProgress) => void
): Promise<{ photos: string[]; panoramaPhotos?: string[] }> {
  if (files.length === 0) {
    return { photos: [], panoramaPhotos: [] };
  }

  const batchCount = Math.ceil(files.length / PROPERTY_PHOTO_BATCH_SIZE);
  let last: { photos: string[]; panoramaPhotos?: string[] } = { photos: [] };

  for (let start = 0; start < files.length; start += PROPERTY_PHOTO_BATCH_SIZE) {
    const batchIndex = Math.floor(start / PROPERTY_PHOTO_BATCH_SIZE);
    const batchFiles = files.slice(start, start + PROPERTY_PHOTO_BATCH_SIZE);
    const batchFlags = panoramaFlags.slice(start, start + PROPERTY_PHOTO_BATCH_SIZE);

    onProgress?.({
      uploaded: start,
      total: files.length,
      batchIndex,
      batchCount,
    });

    last = await addPropertyPhotos(propertyId, batchFiles, batchFlags);

    if (start + PROPERTY_PHOTO_BATCH_SIZE < files.length) {
      await pause(BATCH_PAUSE_MS);
    }
  }

  onProgress?.({
    uploaded: files.length,
    total: files.length,
    batchIndex: batchCount,
    batchCount,
  });

  return last;
}
