/**
 * Upload middleware helpers (multer memory).
 * Filename kept for import compatibility — Cloudinary SDK removed; storage is R2 via mediaStorage.
 */
import multer from 'multer';

/** მიღება სერვერზე (MB) — შემდეგ sharp-ით იკუმშება */
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

/** აგენტის ფოტო — memory → mediaStorage */
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

/** @deprecated name — deletes via mediaStorage (R2). */
export async function deleteCloudinaryImage(imageUrl) {
  const { deleteMediaImage } = await import('./mediaStorage.js');
  return deleteMediaImage(imageUrl);
}
