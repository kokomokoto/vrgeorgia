/**
 * Tour panorama media — prefers backend mediaStorage (R2 when MEDIA_PROVIDER=r2).
 * Kept filename for import compatibility with older routes.
 */
import {
  compressPanoramaForCloudinary,
  deleteCloudinaryImage as deleteLegacyCloudinary,
  isRemotePanoramaStorageReady,
  uploadPanoramaImage,
} from "../../backend/src/services/tour/panoramaImage.js";
import { deleteMediaImage } from "../../backend/src/services/mediaStorage.js";

export {
  compressPanoramaForCloudinary,
  isRemotePanoramaStorageReady,
  uploadPanoramaImage,
};

/** @deprecated — use isRemotePanoramaStorageReady */
export function isCloudinaryConfigured(): boolean {
  return isRemotePanoramaStorageReady();
}

/** Upload compressed panorama to active provider (R2 or Cloudinary). */
export async function uploadPanoramaToCloudinary(
  buffer: Buffer,
  tourId: string,
  sceneId: string
): Promise<string> {
  return uploadPanoramaImage(buffer, tourId, sceneId);
}

/** Delete remote panorama (R2 or Cloudinary) by public URL. */
export async function deleteCloudinaryImage(
  imageUrl: string | null | undefined
): Promise<void> {
  if (!imageUrl) return;
  try {
    const ok = await deleteMediaImage(imageUrl);
    if (!ok && String(imageUrl).includes("cloudinary")) {
      await deleteLegacyCloudinary(imageUrl);
    }
  } catch (err) {
    console.error(
      "Media delete error:",
      err instanceof Error ? err.message : err
    );
  }
}
