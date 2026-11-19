/**
 * Media storage switch: Cloudinary (default) ↔ Cloudflare R2.
 * Set MEDIA_PROVIDER=r2 when R2 env is ready. Transforms stay on the CDN edge.
 */
import { cloudinary, deleteCloudinaryImage as destroyCloudinary } from './cloudinary.js';
import { deleteR2ObjectByUrl, isR2Configured, uploadBufferToR2 } from './r2Media.js';

export function getMediaProvider() {
  const raw = (process.env.MEDIA_PROVIDER || 'cloudinary').trim().toLowerCase();
  if (raw === 'r2' || raw === 'cloudflare') return 'r2';
  return 'cloudinary';
}

export function assertMediaProviderReady() {
  if (getMediaProvider() === 'r2' && !isR2Configured()) {
    throw new Error('MEDIA_PROVIDER=r2 but R2 env vars are incomplete');
  }
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string, contentType?: string, ext?: string, key?: string, resourceType?: string }} [opts]
 */
function uploadBufferToCloudinary(buffer, opts = {}) {
  const folder = opts.folder || 'vrgeorgia/properties';
  const resourceType = opts.resourceType || 'image';
  /** @type {Record<string, unknown>} */
  const params = { folder, resource_type: resourceType };
  if (opts.key) {
    const base = opts.key.replace(/\.[^.]+$/, '');
    const parts = base.split('/');
    params.public_id = parts[parts.length - 1];
    params.folder = parts.slice(0, -1).join('/') || folder;
    params.overwrite = true;
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(params, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string, contentType?: string, ext?: string, key?: string, resourceType?: string }} [opts]
 */
export async function uploadImageBuffer(buffer, opts = {}) {
  assertMediaProviderReady();
  if (getMediaProvider() === 'r2') {
    return uploadBufferToR2(buffer, {
      folder: opts.folder || 'vrgeorgia/properties',
      contentType: opts.contentType || 'image/jpeg',
      ext: opts.ext || 'jpg',
      key: opts.key,
    });
  }
  return uploadBufferToCloudinary(buffer, opts);
}

/** Deletes from whichever host the URL points at. */
export async function deleteMediaImage(imageUrl) {
  if (!imageUrl) return true;
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (base && String(imageUrl).startsWith(base)) {
    return deleteR2ObjectByUrl(imageUrl);
  }
  if (String(imageUrl).includes('cloudinary')) {
    return destroyCloudinary(imageUrl);
  }
  return true;
}
