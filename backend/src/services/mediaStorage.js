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

function uploadBufferToCloudinary(buffer, folder = 'vrgeorgia/properties') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string, contentType?: string, ext?: string }} [opts]
 */
export async function uploadImageBuffer(buffer, opts = {}) {
  assertMediaProviderReady();
  if (getMediaProvider() === 'r2') {
    return uploadBufferToR2(buffer, {
      folder: opts.folder || 'vrgeorgia/properties',
      contentType: opts.contentType || 'image/jpeg',
      ext: opts.ext || 'jpg',
    });
  }
  return uploadBufferToCloudinary(buffer, opts.folder || 'vrgeorgia/properties');
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
