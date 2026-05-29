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

export async function compressPanoramaForCloudinary(input) {
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  let pipeline = sharp(input, { failOn: 'none' }).rotate();

  const maxDim = Math.max(meta.width || 0, meta.height || 0);
  if (maxDim > 4096) {
    pipeline = pipeline.resize(4096, 2048, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let quality = 85;
  let output = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  let attempts = 0;
  while (output.length > CLOUDINARY_MAX_BYTES && attempts < 24) {
    attempts += 1;
    if (quality > 55) {
      quality -= 5;
      output = await sharp(output).jpeg({ quality, mozjpeg: true }).toBuffer();
      continue;
    }
    const m = await sharp(output).metadata();
    const nw = Math.floor((m.width || 1600) * 0.88);
    const nh = Math.floor((m.height || 1200) * 0.88);
    if (nw < 1280 || nh < 640) break;
    output = await sharp(output)
      .resize(nw, nh, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
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
