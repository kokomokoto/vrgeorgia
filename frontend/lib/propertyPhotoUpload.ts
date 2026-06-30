import { addPropertyPhotos } from './api';
import { preparePhotosForUpload } from './clientPhotoCompress';

/** ერთ მოთხოვნაში — RAM/timeout-ის თავიდან ასაცილებლად (Render + Cloudinary) */
export const PROPERTY_PHOTO_BATCH_SIZE = 4;

const BATCH_PAUSE_MS = 400;

export type PhotoUploadProgress = {
  uploaded: number;
  total: number;
  batchIndex: number;
  batchCount: number;
  phase?: 'preparing' | 'uploading';
};

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ფოტოები პაკეტებად ატვირთავს არსებულ ობიექტზე (თანმიმდევრობა ინარჩუნებს).
 * ჩვეულებრივი ფოტოები ჯერ ბრაუზერში იკუმშება (~0.5 MB).
 */
export async function uploadPropertyPhotosInBatches(
  propertyId: string,
  files: File[],
  panoramaFlags: boolean[],
  onProgress?: (progress: PhotoUploadProgress) => void,
  opts?: { draft?: boolean }
): Promise<{ photos: string[]; panoramaPhotos?: string[] }> {
  if (files.length === 0) {
    return { photos: [], panoramaPhotos: [] };
  }

  const batchCount = Math.ceil(files.length / PROPERTY_PHOTO_BATCH_SIZE);

  onProgress?.({
    uploaded: 0,
    total: files.length,
    batchIndex: 0,
    batchCount,
    phase: 'preparing',
  });

  const preparedFiles = await preparePhotosForUpload(files, panoramaFlags, (done, total) => {
    onProgress?.({
      uploaded: done,
      total,
      batchIndex: 0,
      batchCount,
      phase: 'preparing',
    });
  });

  let last: { photos: string[]; panoramaPhotos?: string[] } = { photos: [] };

  for (let start = 0; start < preparedFiles.length; start += PROPERTY_PHOTO_BATCH_SIZE) {
    const batchIndex = Math.floor(start / PROPERTY_PHOTO_BATCH_SIZE);
    const batchFiles = preparedFiles.slice(start, start + PROPERTY_PHOTO_BATCH_SIZE);
    const batchFlags = panoramaFlags.slice(start, start + PROPERTY_PHOTO_BATCH_SIZE);

    onProgress?.({
      uploaded: start,
      total: preparedFiles.length,
      batchIndex,
      batchCount,
      phase: 'uploading',
    });

    last = await addPropertyPhotos(propertyId, batchFiles, batchFlags, opts);

    if (start + PROPERTY_PHOTO_BATCH_SIZE < preparedFiles.length) {
      await pause(BATCH_PAUSE_MS);
    }
  }

  onProgress?.({
    uploaded: preparedFiles.length,
    total: preparedFiles.length,
    batchIndex: batchCount,
    batchCount,
    phase: 'uploading',
  });

  return last;
}
