import sharp from "sharp";

const RATIO_TARGET = 2;
const RATIO_TOLERANCE = 0.05;

export async function validateEquirectangular(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width;
  const height = meta.height;

  if (!width || !height) {
    throw new Error("Could not read image dimensions");
  }

  const ratio = width / height;
  const min = RATIO_TARGET * (1 - RATIO_TOLERANCE);
  const max = RATIO_TARGET * (1 + RATIO_TOLERANCE);

  if (ratio < min || ratio > max) {
    throw new Error(
      `Image must be equirectangular (2:1 aspect ratio). Got ${width}×${height} (${ratio.toFixed(2)}:1)`
    );
  }

  return { width, height };
}
