import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** მიღება სერვერზე (MB) — შემდეგ sharp-ით იკუმშება Cloudinary-ის ~10 MB-მდე */
const PROPERTY_PHOTO_MAX_MB = Number(process.env.PROPERTY_PHOTO_MAX_MB || 50);
export const PROPERTY_PHOTO_MAX_BYTES = PROPERTY_PHOTO_MAX_MB * 1024 * 1024;

const agentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vrgeorgia/agents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vrgeorgia/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }],
  },
});

/** ობიექტის ფოტოები — memory (პირდაპირ Cloudinary-ზე არა, photoUpload.js ამუშავებს) */
export const uploadPropertyPhotos = multer({
  storage: multer.memoryStorage(),
  limits: { files: 30, fileSize: PROPERTY_PHOTO_MAX_BYTES },
});

export const uploadAgentPhoto = multer({
  storage: agentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
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
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  try {
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) return;
    const pathWithVersion = parts[1];
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, '');
    const publicId = pathWithoutVersion.replace(/\.[^.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

export { cloudinary };
