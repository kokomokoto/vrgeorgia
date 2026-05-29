import fs from "fs";
import { uploadPath } from "./paths";
import { deleteCloudinaryImage } from "./cloudinary";

/** Remove panorama file when a scene is deleted or replaced (Cloudinary or local disk). */
export function deleteSceneImageFile(
  tourId: string,
  imagePath: string | null | undefined
): void {
  if (!imagePath) return;

  // Cloudinary / გარე URL — ღრუბლიდან წაშლა (best-effort, არ ვაჩერებთ პასუხს)
  if (imagePath.includes("cloudinary") || /^https?:\/\//i.test(imagePath)) {
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
