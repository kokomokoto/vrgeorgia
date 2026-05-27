import sharp from 'sharp';
import { cloudinary } from './cloudinary.js';

/** Cloudinary უფასო/საწყისი გეგმის ლიმიტი (~10 MB) */
export const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024 - 256 * 1024;

function formatUploadError(err) {
  const msg = String(err?.message || err || '');
  if (msg.includes('File size too large') || msg.includes('Maximum is')) {
    return 'ფოტო ძალიან დიდია (Cloudinary ~10 MB ლიმიტი). სცადეთ უფრო პატარა ფაილი ან გაზარდეთ Cloudinary გეგმა.';
  }
  return msg || 'ფოტოს ატვირთვა ვერ მოხერხდა';
}

/**
 * დიდი/360° ფოტოს შეკუმშვა Cloudinary-ის ლიმიტამდე (JPEG, პროპორცია ინარჩუნება).
 */
export async function compressImageForCloudinary(inputBuffer) {
  const meta = await sharp(inputBuffer, { failOn: 'none' }).metadata();
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

  const w = meta.width || 0;
  const h = meta.height || 0;
  const maxDim = Math.max(w, h);
  const ratio = w > 0 && h > 0 ? w / h : 0;
  const isPanorama = ratio >= 1.92 && ratio <= 2.08;

  // 360° equirectangular — max 4096×2048 (WebGL/viewer-ისთვის საიმედო)
  const initialMax = isPanorama
    ? 4096
    : maxDim > 6000
      ? 8192
      : maxDim > 4000
        ? 6144
        : 4096;
  if (maxDim > initialMax) {
    pipeline = pipeline.resize(initialMax, initialMax, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let quality = 88;
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
    if (nw < 640 || nh < 480) break;
    output = await sharp(output)
      .resize(nw, nh, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  }

  if (output.length > CLOUDINARY_MAX_BYTES) {
    throw new Error(formatUploadError({ message: 'File size too large' }));
  }

  return output;
}

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'vrgeorgia/properties',
        resource_type: 'image',
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/** Multer memory ფაილებიდან → შეკუმშვა → Cloudinary URL-ები */
export async function uploadPropertyPhotosFromFiles(files) {
  const list = files || [];
  if (list.length === 0) {
    return { urls: [], warnings: [] };
  }

  const urls = [];
  const warnings = [];

  for (const file of list) {
    if (!file.buffer?.length) continue;
    try {
      const compressed = await compressImageForCloudinary(file.buffer);
      const url = await uploadBufferToCloudinary(compressed);
      urls.push(url);
      if (file.size > CLOUDINARY_MAX_BYTES) {
        const mbBefore = (file.size / (1024 * 1024)).toFixed(1);
        const mbAfter = (compressed.length / (1024 * 1024)).toFixed(1);
        warnings.push(
          `${file.originalname || 'ფოტო'}: ${mbBefore} MB → ${mbAfter} MB (ავტომატური შეკუმშვა 360°/დიდი ფოტოსთვის)`
        );
      }
    } catch (err) {
      throw new Error(formatUploadError(err));
    }
  }

  return { urls, warnings };
}
