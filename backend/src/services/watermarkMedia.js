/**
 * Overlay "vhome.ge" text watermark (south-west) via sharp — used for R2 downloads.
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
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${padX}"
        y="${height - padY}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="rgba(255,255,255,0.55)"
      >${label.replace(/[<>&]/g, '')}</text>
    </svg>
  `;
  return sharp(input, { failOn: 'none' })
    .rotate()
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}
