/**
 * Media storage — Cloudflare R2 only.
 * Legacy Cloudinary URLs are ignored on delete (assets already migrated).
 */
import { deleteR2ObjectByUrl, isR2Configured, uploadBufferToR2 } from './r2Media.js';

export function getMediaProvider() {
  return 'r2';
}

export function assertMediaProviderReady() {
  if (!isR2Configured()) {
    throw new Error('R2 env vars are incomplete (CF_ACCOUNT_ID, R2_*, R2_PUBLIC_BASE_URL)');
  }
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string, contentType?: string, ext?: string, key?: string, resourceType?: string }} [opts]
 */
export async function uploadImageBuffer(buffer, opts = {}) {
  assertMediaProviderReady();
  return uploadBufferToR2(buffer, {
    folder: opts.folder || 'vrgeorgia/properties',
    contentType: opts.contentType || 'image/jpeg',
    ext: opts.ext || 'jpg',
    key: opts.key,
  });
}

/** Deletes R2 objects; Cloudinary/other hosts → no-op success (migrated away). */
export async function deleteMediaImage(imageUrl) {
  if (!imageUrl) return true;
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (base && String(imageUrl).startsWith(base)) {
    return deleteR2ObjectByUrl(imageUrl);
  }
  return true;
}
