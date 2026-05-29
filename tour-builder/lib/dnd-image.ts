const PANORAMA_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isPanoramaImageFile(file: File): boolean {
  return PANORAMA_MIME.has(file.type);
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
