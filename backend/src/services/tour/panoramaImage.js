import sharp from 'sharp';
import { cloudinary, deleteCloudinaryImage } from '../cloudinary.js';

const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024 - 256 * 1024;

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
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

  if (output.length > CLOUDINARY_MAX_BYTES) {
    throw new Error(
      'ფოტო ძალიან დიდია (Cloudinary ~10 MB ლიმიტი). სცადეთ უფრო პატარა ფაილი.'
    );
  }

  return output;
}

export function uploadPanoramaToCloudinary(buffer, tourId, sceneId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `vrgeorgia/tours/${tourId}`,
        public_id: sceneId,
        overwrite: true,
        resource_type: 'image',
      },
      (err, result) => {
        if (err || !result) {
          reject(err || new Error('Cloudinary upload failed'));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(buffer);
  });
}

export { deleteCloudinaryImage };
