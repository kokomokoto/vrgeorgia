import fs from 'node:fs';
import { deleteCloudinaryImage } from './panoramaImage.js';
import { tourUploadPath } from './tourPaths.js';

export function deleteSceneImageFile(tourId, imagePath) {
  if (!imagePath) return;

  if (imagePath.includes('cloudinary') || /^https?:\/\//i.test(imagePath)) {
    void deleteCloudinaryImage(imagePath);
    return;
  }

  const filename = imagePath.split('/').pop();
  if (!filename) return;
  const fullPath = tourUploadPath(tourId, filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
