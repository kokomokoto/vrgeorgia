import fs from "fs";
import { uploadPath } from "./paths";
import { deleteCloudinaryImage } from "./cloudinary";

/** Remove panorama file when a scene is deleted or replaced (R2 / Cloudinary / local disk). */
export function deleteSceneImageFile(
  tourId: string,
  imagePath: string | null | undefined
): void {
  if (!imagePath) return;

  // Remote URL (R2 media.vhome.ge / Cloudinary) — best-effort delete
  if (
    imagePath.includes("cloudinary") ||
    imagePath.includes("media.vhome.ge") ||
    /^https?:\/\//i.test(imagePath)
  ) {
    void deleteCloudinaryImage(imagePath);
    return;
  }

  // ლოკალური ფაილი
  const filename = imagePath.split("/").pop();
  if (!filename) return;
  const fullPath = uploadPath(tourId, filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
