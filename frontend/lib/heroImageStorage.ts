/** IndexedDB storage for homepage hero gallery images (day/night). */

const DB_NAME = 'vhome-hero-images';
const DB_VERSION = 1;
const STORE = 'blobs';

export const DEFAULT_HERO_IMAGE = '/images/home-hero-zgva.jpg';
export const MAX_HERO_IMAGES_PER_MODE = 12;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

export async function putHeroImageBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('put failed'));
    });
  } finally {
    db.close();
  }
}

export async function getHeroImageBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) || null);
      req.onerror = () => reject(req.error || new Error('get failed'));
    });
  } finally {
    db.close();
  }
}

export async function deleteHeroImageBlob(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('delete failed'));
    });
  } finally {
    db.close();
  }
}

/** Resolve gallery ids → object URLs. Caller must revoke when done. */
export async function resolveHeroImageUrls(
  ids: string[]
): Promise<{ id: string; url: string }[]> {
  const out: { id: string; url: string }[] = [];
  for (const id of ids) {
    try {
      const blob = await getHeroImageBlob(id);
      if (blob) out.push({ id, url: URL.createObjectURL(blob) });
    } catch {
      /* skip missing */
    }
  }
  return out;
}

export function revokeHeroUrls(urls: { url: string }[]) {
  for (const item of urls) {
    if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
  }
}
