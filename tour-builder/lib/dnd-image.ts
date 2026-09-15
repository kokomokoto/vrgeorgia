/** Keep in sync with server validateEquirectangular (lib/image.ts). */
const MIN_PANORAMA_WIDTH = 2048;
const MIN_PANORAMA_HEIGHT = 1024;

const PANORAMA_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isPanoramaImageFile(file: File): boolean {
  return PANORAMA_MIME.has(file.type);
}

/** Read pixel size in the browser before upload (rejects 150×75-style thumbnails). */
export function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (!width || !height) {
        reject(new Error("Could not read image dimensions"));
        return;
      }
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export async function assertPanoramaFileReady(file: File): Promise<void> {
  if (!isPanoramaImageFile(file)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }
  const { width, height } = await readImageDimensions(file);
  const ratio = width / height;
  if (ratio < 1.9 || ratio > 2.1) {
    throw new Error(
      `Image must be equirectangular (2:1 aspect ratio). Got ${width}×${height} (${ratio.toFixed(2)}:1)`
    );
  }
  if (width < MIN_PANORAMA_WIDTH || height < MIN_PANORAMA_HEIGHT) {
    throw new Error(
      `Panorama resolution too low (${width}×${height}). Use at least ${MIN_PANORAMA_WIDTH}×${MIN_PANORAMA_HEIGHT} — full 360° file, not a thumbnail.`
    );
  }
}

export function getImageFilesFromDataTransfer(
  dataTransfer: DataTransfer
): File[] {
  if (!dataTransfer.files?.length) return [];
  return Array.from(dataTransfer.files)
    .filter(isPanoramaImageFile)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export function getImageFileFromDataTransfer(
  dataTransfer: DataTransfer
): File | null {
  return getImageFilesFromDataTransfer(dataTransfer)[0] ?? null;
}

export function sceneNameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/i, "").trim();
  return base || "Scene";
}

export function hasPanoramaImageInDataTransfer(dataTransfer: DataTransfer): boolean {
  if (dataTransfer.types.includes("Files")) {
    return true;
  }
  return dataTransfer.types.some((t) => t === "image/jpeg" || t === "image/png" || t === "image/webp");
}
