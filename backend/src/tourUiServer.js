import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TOUR_BUILDER_DIR = path.resolve(__dirname, '..', '..', 'tour-builder');

/** Next.js prepare() — მხოლოდ პირველი /embed, /v/, /tours/ მოთხოვნაზე (512MB Starter-ზე API უფრო სტაბილურია) */
let handlerPromise = null;

async function getTourRequestHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const { default: next } = await import('next');
      const nextApp = next({
        dev: false,
        dir: TOUR_BUILDER_DIR,
      });
      await nextApp.prepare();
      console.log('[tour-ui] Next.js ready (lazy init)');
      return nextApp.getRequestHandler();
    })().catch((err) => {
      handlerPromise = null;
      throw err;
    });
  }
  return handlerPromise;
}

/**
 * 3D ტურის UI — middleware რეგისტრაცია (Next.js არ იტვირთება სერვერის გაშვებისას).
 */
export async function attachTourUi(app) {
  if (process.env.TOUR_UI_ENABLED === 'false') {
    console.log('[tour-ui] disabled (TOUR_UI_ENABLED=false)');
    return false;
  }

  const nextDir = path.join(TOUR_BUILDER_DIR, '.next');
  if (!fs.existsSync(nextDir)) {
    const msg =
      '[tour-ui] .next not found — UI disabled. Build: npm run build (from backend)';
    if (process.env.NODE_ENV === 'production') {
      console.warn(msg);
    } else {
      console.log(`${msg} (dev: npm run dev in tour-builder on :3002)`);
    }
    return false;
  }

  const defaultFrameAncestors =
    "'self' http://localhost:3000 http://127.0.0.1:3000 https://vrgeorgia.ge https://www.vrgeorgia.ge https://vrgeorgia-frontend.onrender.com https://vrgeorgia-api.onrender.com";
  const frameAncestors = (
    process.env.TOUR_FRAME_ANCESTORS || defaultFrameAncestors
  ).trim();

  app.use(async (req, res, nextMiddleware) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return nextMiddleware();
    }

    try {
      const handle = await getTourRequestHandler();

      if (req.path.startsWith('/v/')) {
        res.setHeader(
          'Content-Security-Policy',
          `frame-ancestors ${frameAncestors}`
        );
        res.removeHeader('X-Frame-Options');
      }

      return handle(req, res);
    } catch (err) {
      console.error('[tour-ui] request failed:', err);
      if (!res.headersSent) {
        res.status(503).send('3D tour UI is loading or unavailable. Try again in a moment.');
      }
    }
  });

  console.log('[tour-ui] routes registered (lazy load on first visit)');
  return true;
}
