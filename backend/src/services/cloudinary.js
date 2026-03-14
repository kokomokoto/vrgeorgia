import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for property photos
const propertyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vrgeorgia/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1600, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for agent photos
const agentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vrgeorgia/agents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vrgeorgia/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }],
  },
});

// Multer instances
export const uploadPropertyPhotos = multer({
  storage: propertyStorage,
  limits: { files: 12, fileSize: 8 * 1024 * 1024 },
});

export const uploadAgentPhoto = multer({
  storage: agentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
});

// Delete an image from Cloudinary by URL
export async function deleteCloudinaryImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  try {
    // Extract public_id from URL: https://res.cloudinary.com/xxx/image/upload/v123/folder/filename.jpg
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) return;
    const pathWithVersion = parts[1]; // v123/folder/filename.jpg
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, ''); // folder/filename.jpg
    const publicId = pathWithoutVersion.replace(/\.[^.]+$/, ''); // folder/filename
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

export { cloudinary };
