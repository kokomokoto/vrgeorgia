import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TOUR_BUILDER_DIR = path.resolve(__dirname, '..', '..', 'tour-builder');

export async function attachTourUi(app) {
  if (process.env.TOUR_UI_ENABLED === 'false') {
    console.log('[tour-ui] disabled (TOUR_UI_ENABLED=false)');
    return false;
  }

  const nextDir = path.join(TOUR_BUILDER_DIR, '.next');
  if (!fs.existsSync(nextDir)) {
    const msg =
      '[tour-ui] .next not found — UI disabled. Build: npm run build:tour-ui (from backend)';
    if (process.env.NODE_ENV === 'production') {
      console.warn(msg);
    } else {
      console.log(`${msg} (dev: npm run dev in tour-builder on :3002)`);
    }
    return false;
  }

  const dev = process.env.NODE_ENV !== 'production';
  const nextApp = next({ dev, dir: TOUR_BUILDER_DIR });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  const defaultFrameAncestors =
    "'self' https://vrgeorgia.ge https://www.vrgeorgia.ge https://vrgeorgia-frontend.onrender.com https://vrgeorgia-api.onrender.com";
  const frameAncestors = (
    process.env.TOUR_FRAME_ANCESTORS || defaultFrameAncestors
  ).trim();

  app.use((req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).end();
    }

    // გამოქვეყნებული ტური — iframe-ში ჩასმა მთავარი საიტიდან
    if (req.path.startsWith('/v/')) {
      res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors ${frameAncestors}`
      );
      res.removeHeader('X-Frame-Options');
    }

    return handle(req, res);
  });

  console.log(`[tour-ui] attached from ${TOUR_BUILDER_DIR}`);
  return true;
}
