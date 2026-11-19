import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** მიღება სერვერზე (MB) — შემდეგ sharp-ით იკუმშება ~10 MB-მდე */
const PROPERTY_PHOTO_MAX_MB = Number(process.env.PROPERTY_PHOTO_MAX_MB || 50);
export const PROPERTY_PHOTO_MAX_BYTES = PROPERTY_PHOTO_MAX_MB * 1024 * 1024;

const imageFileFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return cb(null, true);
  cb(new Error('მხოლოდ სურათის ფაილებია დაშვებული'));
};

/** ობიექტის ფოტოები — memory (photoUpload.js → mediaStorage) */
export const uploadPropertyPhotos = multer({
  storage: multer.memoryStorage(),
  limits: { files: 30, fileSize: PROPERTY_PHOTO_MAX_BYTES },
});

/** აგენტის ფოტო — memory → mediaStorage (R2 ან Cloudinary) */
export const uploadAgentPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

/** ავატარი — memory → mediaStorage */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export function uploadPropertyPhotosMiddleware(maxFiles = 30) {
  return (req, res, next) => {
    uploadPropertyPhotos.array('photos', maxFiles)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: `ფოტო ძალიან დიდია. მაქსიმუმ ${PROPERTY_PHOTO_MAX_MB} MB თითო ფოტოზე (სერვერი შემდეგ ავტომატურად დააპატარავებს).`,
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: `ძალიან ბევრი ფოტო. მაქსიმუმ ${maxFiles} ერთ ჯერზე.`,
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'არასწორი ფაილის ველი.' });
      }
      return next(err);
    });
  };
}

export async function deleteCloudinaryImage(imageUrl) {
  if (!imageUrl) return true;
  // R2 / Cloudflare public URLs — route through media helper without circular import cost.
  const r2Base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (r2Base && String(imageUrl).startsWith(r2Base)) {
    const { deleteR2ObjectByUrl } = await import('./r2Media.js');
    return deleteR2ObjectByUrl(imageUrl);
  }
  if (!String(imageUrl).includes('cloudinary')) return true;
  try {
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) return false;
    const pathWithVersion = parts[1].split('?')[0];
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, '');
    const publicId = pathWithoutVersion.replace(/\.[^.]+$/, '');
    if (!publicId) return false;
    const result = await cloudinary.uploader.destroy(publicId);
    const status = result?.result;
    return status === 'ok' || status === 'not found';
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
    return false;
  }
}

export { cloudinary };
