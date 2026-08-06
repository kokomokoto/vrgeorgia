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

import {
  externalMediaDisplayUrl,
  parseExternalMediaId,
  type DesignMediaKind,
} from '@/lib/designMedia';

export type ResolvedHeroMedia = {
  id: string;
  url: string;
  kind: DesignMediaKind;
  /** Direct video file or YouTube embed URL for playback */
  embedUrl?: string;
};

/** Resolve gallery ids → display URLs (IndexedDB blobs or external links). Caller must revoke blob: URLs. */
export async function resolveHeroImageUrls(
  ids: string[]
): Promise<ResolvedHeroMedia[]> {
  const out: ResolvedHeroMedia[] = [];
  for (const id of ids) {
    const external = parseExternalMediaId(id);
    if (external) {
      const display = externalMediaDisplayUrl(external.kind, external.url);
      out.push({
        id,
        url: display.url,
        kind: external.kind,
        embedUrl: display.embedUrl,
      });
      continue;
    }
    try {
      const blob = await getHeroImageBlob(id);
      if (!blob) continue;
      const kind: DesignMediaKind =
        blob.type === 'image/gif'
          ? 'gif'
          : blob.type.startsWith('video/')
            ? 'video'
            : 'image';
      const objectUrl = URL.createObjectURL(blob);
      out.push({
        id,
        url: objectUrl,
        kind,
        embedUrl: kind === 'video' ? objectUrl : undefined,
      });
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
