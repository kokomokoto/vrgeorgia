import sharp from 'sharp';
import { cloudinary } from './cloudinary.js';

/** Cloudinary უფასო/საწყისი გეგმის ლიმიტი (~10 MB) — 360° პანორამა */
export const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024 - 256 * 1024;

/** ჩვეულებრივი ფოტო — ბრაუზერის შეკუმშვის შემდეგ backend safety net */
const REGULAR_MAX_BYTES = 512 * 1024;
const REGULAR_MAX_DIMENSION = 2560;

function formatUploadError(err) {
  const msg = String(err?.message || err || '');
  if (msg.includes('File size too large') || msg.includes('Maximum is')) {
    return 'ფოტო ძალიან დიდია (Cloudinary ~10 MB ლიმიტი). სცადეთ უფრო პატარა ფაილი ან გაზარდეთ Cloudinary გეგმა.';
  }
  return msg || 'ფოტოს ატვირთვა ვერ მოხერხდა';
}

function isPanoramaBuffer(meta) {
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return false;
  const ratio = w / h;
  return ratio >= 1.92 && ratio <= 2.08;
}

/**
 * 360° პანორამის შეკუმშვა Cloudinary-ის ~10 MB ლიმიტამდე (უცვლელი ლოგიკა).
 */
export async function compressPanoramaPhotoForCloudinary(inputBuffer) {
  const meta = await sharp(inputBuffer, { failOn: 'none' }).metadata();
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

  const maxDim = Math.max(meta.width || 0, meta.height || 0);
  if (maxDim > 4096) {
    pipeline = pipeline.resize(4096, 4096, {
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

/** @deprecated — გამოიყენე compressPanoramaPhotoForCloudinary */
export async function compressImageForCloudinary(inputBuffer) {
  const meta = await sharp(inputBuffer, { failOn: 'none' }).metadata();
  if (isPanoramaBuffer(meta)) {
    return compressPanoramaPhotoForCloudinary(inputBuffer);
  }
  return compressRegularPhotoForCloudinary(inputBuffer);
}

/**
 * ჩვეულებრივი ფოტო — ბრაუზერის შეკუმშვის შემდეგ მსუბუქი Sharp pass (~0.5 MB).
 */
export async function compressRegularPhotoForCloudinary(inputBuffer) {
  const meta = await sharp(inputBuffer, { failOn: 'none' }).metadata();
  let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

  const maxDim = Math.max(meta.width || 0, meta.height || 0);
  if (maxDim > REGULAR_MAX_DIMENSION) {
    pipeline = pipeline.resize(REGULAR_MAX_DIMENSION, REGULAR_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let quality = 85;
  let output = await pipeline
    .jpeg({ quality, mozjpeg: true, progressive: true })
    .toBuffer();

  let attempts = 0;
  while (output.length > REGULAR_MAX_BYTES && attempts < 24) {
    attempts += 1;
    if (quality > 60) {
      quality -= 5;
      output = await sharp(output)
        .jpeg({ quality, mozjpeg: true, progressive: true })
        .toBuffer();
      continue;
    }
    const m = await sharp(output).metadata();
    const nw = Math.floor((m.width || 1600) * 0.85);
    const nh = Math.floor((m.height || 1200) * 0.85);
    if (nw < 640 || nh < 480) break;
    output = await sharp(output)
      .resize(nw, nh, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true, progressive: true })
      .toBuffer();
  }

  // 0.5 MB სასურველი ზომაა და არა უარის თქმის საფუძველი — ფოტოს დაკარგვა
  // აგენტს აიძულებს მთელი ობიექტი ხელახლა ატვირთოს. ვწყვეტთ მხოლოდ მაშინ,
  // როცა Cloudinary-ის რეალურ ლიმიტსაც სცდება.
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

const CLOUDINARY_UPLOAD_ATTEMPTS = 3;

async function uploadWithRetry(buffer) {
  let lastErr = null;
  for (let attempt = 1; attempt <= CLOUDINARY_UPLOAD_ATTEMPTS; attempt++) {
    try {
      return await uploadBufferToCloudinary(buffer);
    } catch (err) {
      lastErr = err;
      // ზომის შეცდომა გამეორებით არ გამოსწორდება
      if (String(err?.message || '').includes('File size too large')) break;
      if (attempt < CLOUDINARY_UPLOAD_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }
  throw lastErr;
}

/**
 * Multer memory ფაილებიდან → შეკუმშვა → Cloudinary URL-ები.
 *
 * ერთი გაუმართავი ფოტო მთელ პაკეტს არ აგდებს: წარმატებულები ინახება და
 * ჩავარდნილები `failures`-ში ბრუნდება, რომ აგენტმა მხოლოდ ისინი ჩაანაცვლოს.
 */
export async function uploadPropertyPhotosFromFiles(files, panoramaFlags = []) {
  const list = files || [];
  if (list.length === 0) {
    return { urls: [], warnings: [], failures: [], panoramaUrls: [] };
  }

  const urls = [];
  const panoramaUrls = [];
  const warnings = [];
  const failures = [];

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    const name = file?.originalname || `ფოტო #${i + 1}`;
    if (!file?.buffer?.length) {
      failures.push({ name, message: 'ფაილი ცარიელია ან ვერ წაიკითხა' });
      continue;
    }
    const isPanorama = Boolean(panoramaFlags[i]);
    try {
      const compressed = isPanorama
        ? await compressPanoramaPhotoForCloudinary(file.buffer)
        : await compressRegularPhotoForCloudinary(file.buffer);
      const url = await uploadWithRetry(compressed);
      urls.push(url);
      if (isPanorama) panoramaUrls.push(url);
      const limit = isPanorama ? CLOUDINARY_MAX_BYTES : REGULAR_MAX_BYTES;
      if (file.size > limit) {
        const mbBefore = (file.size / (1024 * 1024)).toFixed(1);
        const mbAfter = (compressed.length / (1024 * 1024)).toFixed(2);
        warnings.push(
          `${name}: ${mbBefore} MB → ${mbAfter} MB (${isPanorama ? '360°' : 'ჩვეულებრივი'} შეკუმშვა)`
        );
      }
    } catch (err) {
      console.error('photo upload failed:', name, err?.message || err);
      failures.push({ name, message: formatUploadError(err) });
    }
  }

  return { urls, warnings, failures, panoramaUrls };
}
