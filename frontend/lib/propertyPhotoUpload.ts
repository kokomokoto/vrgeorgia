import { addPropertyPhotos } from './api';
import { compressPhotoForUpload } from './clientPhotoCompress';

/** ერთ მოთხოვნაში — RAM/timeout-ის თავიდან ასაცილებლად (Render + Cloudinary) */
export const PROPERTY_PHOTO_BATCH_SIZE = 4;

const BATCH_PAUSE_MS = 400;

/** ერთი პაკეტის ცდები — ქსელის მოკლე ჩავარდნა მთელ ატვირთვას არ უნდა გააუქმოს */
const BATCH_MAX_ATTEMPTS = 3;
const BATCH_RETRY_BASE_MS = 1500;

export type PhotoUploadProgress = {
  uploaded: number;
  total: number;
  batchIndex: number;
  batchCount: number;
  phase?: 'preparing' | 'uploading';
  /** მიმდინარე პაკეტის გამეორების ნომერი (1 = პირველი ცდა) */
  attempt?: number;
};

/** ატვირთვის ერთეული — id საშუალებას გვაძლევს გამეორებაზე უკვე ატვირთული გამოვტოვოთ */
export type PhotoUploadItem = {
  id: string;
  file: File;
};

export type PhotoUploadResult = {
  photos: string[];
  panoramaPhotos?: string[];
  /** ამ გაშვებაზე წარმატებით ატვირთული ერთეულების id-ები */
  uploadedIds: string[];
  /** სერვერმა უარი თქვა ამ ფაილებზე (დანარჩენი მაინც აიტვირთა) */
  failures: { name: string; message: string }[];
};

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableUploadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  // ვალიდაციის/უფლებების შეცდომა გამეორებით არ გამოსწორდება
  if (/Forbidden|Not found|ძალიან დიდია|არასწორი ფაილის ველი|ძალიან ბევრი ფოტო/i.test(msg)) {
    return false;
  }
  return true;
}

/**
 * ფოტოები პაკეტებად ატვირთავს არსებულ ობიექტზე (თანმიმდევრობა ინარჩუნებს).
 * ჩვეულებრივი ფოტოები ჯერ ბრაუზერში იკუმშება (~0.5 MB).
 *
 * `skipIds` — უკვე ატვირთული ერთეულები (ჩავარდნილი ატვირთვის გაგრძელებისთვის):
 * გამეორებაზე იმავე ფოტოს მეორედ არ ვგზავნით.
 */
export async function uploadPropertyPhotosInBatches(
  propertyId: string,
  items: PhotoUploadItem[],
  panoramaFlags: boolean[],
  onProgress?: (progress: PhotoUploadProgress) => void,
  opts?: { draft?: boolean; skipIds?: Set<string>; onBatchUploaded?: (ids: string[]) => void }
): Promise<PhotoUploadResult> {
  const skipIds = opts?.skipIds;
  const pending = items
    .map((item, index) => ({ item, isPanorama: Boolean(panoramaFlags[index]) }))
    .filter(({ item }) => !skipIds?.has(item.id));

  if (pending.length === 0) {
    return { photos: [], panoramaPhotos: [], uploadedIds: [], failures: [] };
  }

  const batchCount = Math.ceil(pending.length / PROPERTY_PHOTO_BATCH_SIZE);

  onProgress?.({
    uploaded: 0,
    total: pending.length,
    batchIndex: 0,
    batchCount,
    phase: 'preparing',
  });

  // შეკუმშვა პაკეტების ციკლში ხდება, არა ყველა ფოტოზე წინასწარ — ასე პირველი
  // ფოტო რამდენიმე წამში სერვერზეა და ობიექტი უფოტოო არ რჩება.
  let last: { photos: string[]; panoramaPhotos?: string[] } = { photos: [] };
  const uploadedIds: string[] = [];
  const failures: { name: string; message: string }[] = [];

  for (let start = 0; start < pending.length; start += PROPERTY_PHOTO_BATCH_SIZE) {
    const batchIndex = Math.floor(start / PROPERTY_PHOTO_BATCH_SIZE);
    const batch = pending.slice(start, start + PROPERTY_PHOTO_BATCH_SIZE);

    onProgress?.({
      uploaded: start,
      total: pending.length,
      batchIndex,
      batchCount,
      phase: 'preparing',
    });

    const batchFiles: File[] = [];
    for (const entry of batch) {
      batchFiles.push(await compressPhotoForUpload(entry.item.file, entry.isPanorama));
    }
    const batchFlags = batch.map((entry) => entry.isPanorama);

    let lastError: unknown = null;
    let uploaded = false;

    for (let attempt = 1; attempt <= BATCH_MAX_ATTEMPTS; attempt++) {
      onProgress?.({
        uploaded: start,
        total: pending.length,
        batchIndex,
        batchCount,
        phase: 'uploading',
        attempt,
      });
      try {
        const res = await addPropertyPhotos(propertyId, batchFiles, batchFlags, opts);
        last = res;
        if (res.photoFailures?.length) failures.push(...res.photoFailures);
        const ids = batch.map((entry) => entry.item.id);
        uploadedIds.push(...ids);
        opts?.onBatchUploaded?.(ids);
        uploaded = true;
        break;
      } catch (err) {
        lastError = err;
        if (!isRetriableUploadError(err) || attempt === BATCH_MAX_ATTEMPTS) break;
        await pause(BATCH_RETRY_BASE_MS * attempt);
      }
    }

    if (!uploaded) throw lastError;

    onProgress?.({
      uploaded: Math.min(start + batch.length, pending.length),
      total: pending.length,
      batchIndex,
      batchCount,
      phase: 'uploading',
    });

    if (start + PROPERTY_PHOTO_BATCH_SIZE < pending.length) {
      await pause(BATCH_PAUSE_MS);
    }
  }

  return {
    photos: last.photos,
    panoramaPhotos: last.panoramaPhotos,
    uploadedIds,
    failures,
  };
}
