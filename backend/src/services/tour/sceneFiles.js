import fs from 'node:fs';
import { deleteMediaImage } from '../mediaStorage.js';
import { tourUploadPath } from './tourPaths.js';

export function deleteSceneImageFile(tourId, imagePath) {
  if (!imagePath) return;

  if (
    imagePath.includes('cloudinary') ||
    imagePath.includes('media.vhome.ge') ||
    /^https?:\/\//i.test(imagePath)
  ) {
    void deleteMediaImage(imagePath);
    return;
  }

  const filename = imagePath.split('/').pop();
  if (!filename) return;
  const fullPath = tourUploadPath(tourId, filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
