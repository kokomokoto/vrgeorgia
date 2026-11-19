import sharp from 'sharp';
import { deleteCloudinaryImage } from '../cloudinary.js';
import { getMediaProvider, uploadImageBuffer } from '../mediaStorage.js';
import { isR2Configured } from '../r2Media.js';

const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024 - 256 * 1024;

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/** True when remote panorama storage (R2 or Cloudinary) is ready. */
export function isRemotePanoramaStorageReady() {
  if (getMediaProvider() === 'r2') return isR2Configured();
  return isCloudinaryConfigured();
}

/** Keep high resolution for 360° viewer (max ~8192×4096, never below ~2048×1024). */
export async function compressPanoramaForCloudinary(input) {
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  let pipeline = sharp(input, { failOn: 'none' }).rotate();

  const maxDim = Math.max(meta.width || 0, meta.height || 0);
  if (maxDim > 8192) {
    pipeline = pipeline.resize(8192, 4096, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let quality = 90;
  let output = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  let attempts = 0;
  while (output.length > CLOUDINARY_MAX_BYTES && attempts < 24) {
    attempts += 1;
    if (quality > 70) {
      quality -= 5;
      output = await sharp(output).jpeg({ quality, mozjpeg: true }).toBuffer();
      continue;
    }
    const m = await sharp(output).metadata();
    const nw = Math.floor((m.width || 4096) * 0.92);
    const nh = Math.floor((m.height || 2048) * 0.92);
    if (nw < 2048 || nh < 1024) {
      quality = Math.max(55, quality - 5);
      output = await sharp(output).jpeg({ quality, mozjpeg: true }).toBuffer();
      if (quality <= 55) break;
      continue;
    }
    output = await sharp(output)
      .resize(nw, nh, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: Math.max(70, quality), mozjpeg: true })
      .toBuffer();
  }

  if (getMediaProvider() !== 'r2' && output.length > CLOUDINARY_MAX_BYTES) {
    throw new Error(
      'ფოტო ძალიან დიდია (Cloudinary ~10 MB ლიმიტი). სცადეთ უფრო პატარა ფაილი.'
    );
  }

  return output;
}

/**
 * Upload panorama to active media provider (R2 or Cloudinary).
 * Stable key so re-upload overwrites the same object.
 */
export async function uploadPanoramaImage(buffer, tourId, sceneId) {
  const key = `vrgeorgia/tours/${tourId}/${sceneId}.jpg`;
  return uploadImageBuffer(buffer, {
    folder: `vrgeorgia/tours/${tourId}`,
    contentType: 'image/jpeg',
    ext: 'jpg',
    key,
  });
}

/** @deprecated — გამოიყენე uploadPanoramaImage */
export function uploadPanoramaToCloudinary(buffer, tourId, sceneId) {
  return uploadPanoramaImage(buffer, tourId, sceneId);
}

export { deleteCloudinaryImage };
