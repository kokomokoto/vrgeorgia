import express from 'express';
import { applyTextWatermark } from '../services/watermarkMedia.js';

const router = express.Router();

function isAllowedMediaUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    const r2Host = process.env.R2_PUBLIC_BASE_URL
      ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname.toLowerCase()
      : '';
    if (r2Host && host === r2Host) return true;
    if (host === 'res.cloudinary.com') return true;
    if (host.endsWith('.r2.dev')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * GET /api/media/watermarked?url=<absolute media url>
 * Returns JPEG with vhome.ge overlay (for R2 / non-Cloudinary downloads).
 */
router.get('/media/watermarked', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url || !isAllowedMediaUrl(url)) {
    return res.status(400).json({ message: 'არასწორი ან აკრძალული URL' });
  }
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(502).json({ message: `წყარო ${upstream.status}` });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const out = await applyTextWatermark(buf);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="vhome-photo.jpg"'
    );
    res.send(out);
  } catch (err) {
    console.error('GET /api/media/watermarked:', err);
    res.status(500).json({ message: err?.message || 'ვოთერმარკი ვერ შეიქმნა' });
  }
});

export default router;
