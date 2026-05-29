import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Cloudinary გასაღებები მითითებულია თუ არა (production-ში — კი, local-ში — შესაძლოა არა) */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/** Cloudinary უფასო/საწყისი გეგმის ლიმიტი (~10 MB) */
const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024 - 256 * 1024;

/**
 * 360° equirectangular პანორამის შეკუმშვა Cloudinary-ის ლიმიტამდე.
 * ჯერ max 4096×2048-მდე ამცირებს, შემდეგ ხარისხს ციკლურად ამცირებს < ~10 MB-მდე.
 */
export async function compressPanoramaForCloudinary(
  input: Buffer
): Promise<Buffer> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  let pipeline = sharp(input, { failOn: "none" }).rotate();

  const maxDim = Math.max(meta.width || 0, meta.height || 0);
  if (maxDim > 4096) {
    pipeline = pipeline.resize(4096, 2048, {
      fit: "inside",
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
    // პანორამისთვის ძალიან პატარა ზომას ვერ ჩამოვა — ხარისხი დაიკარგება
    if (nw < 1280 || nh < 640) break;
    output = await sharp(output)
      .resize(nw, nh, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  }

  if (output.length > CLOUDINARY_MAX_BYTES) {
    throw new Error(
      "ფოტო ძალიან დიდია (Cloudinary ~10 MB ლიმიტი). სცადეთ უფრო პატარა ფაილი."
    );
  }

  return output;
}

/** შეკუმშული პანორამის ატვირთვა Cloudinary-ზე — აბრუნებს secure_url-ს */
export function uploadPanoramaToCloudinary(
  buffer: Buffer,
  tourId: string,
  sceneId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `vrgeorgia/tours/${tourId}`,
        public_id: sceneId,
        overwrite: true,
        resource_type: "image",
      },
      (err, result) => {
        if (err || !result) {
          reject(err || new Error("Cloudinary upload failed"));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(buffer);
  });
}

/** Cloudinary-დან ფოტოს წაშლა URL-ის მიხედვით (best-effort) */
export async function deleteCloudinaryImage(
  imageUrl: string | null | undefined
): Promise<void> {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return;
  try {
    const parts = imageUrl.split("/upload/");
    if (parts.length < 2) return;
    const pathWithVersion = parts[1];
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, "");
    const publicId = pathWithoutVersion.replace(/\.[^.]+$/, "");
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(
      "Cloudinary delete error:",
      err instanceof Error ? err.message : err
    );
  }
}

export { cloudinary };
