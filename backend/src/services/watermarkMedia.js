/**
 * Overlay "vhome.ge" text watermark (south-west) via sharp — used for R2 display/download.
 */
import sharp from 'sharp';

/**
 * @param {Buffer} input
 * @param {{ label?: string }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function applyTextWatermark(input, opts = {}) {
  const label = opts.label || 'vhome.ge';
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  const width = meta.width || 1600;
  const height = meta.height || 1200;
  const fontSize = Math.max(22, Math.round(Math.min(width, height) * 0.035));
  const padX = Math.round(fontSize * 0.55);
  const padY = Math.round(fontSize * 0.45);
  const safe = String(label).replace(/[<>&"]/g, '');
  // Stroke keeps the mark readable on pale floors / bright skies.
  const strokeW = Math.max(2, Math.round(fontSize * 0.08));
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${padX}"
        y="${height - padY}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="rgba(255,255,255,0.62)"
        stroke="rgba(0,0,0,0.38)"
        stroke-width="${strokeW}"
        paint-order="stroke"
      >${safe}</text>
    </svg>
  `;
  return sharp(input, { failOn: 'none' })
    .rotate()
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}
