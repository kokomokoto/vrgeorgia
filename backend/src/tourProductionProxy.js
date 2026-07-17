import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOUR_BUILDER_NEXT = path.resolve(__dirname, '..', '..', 'tour-builder', '.next');

const TARGET =
  (process.env.TOUR_PRODUCTION_ORIGIN || 'https://vrgeorgia-api.onrender.com').replace(
    /\/$/,
    ''
  );

const DEV_FRAME_ANCESTORS =
  "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000 http://localhost:3007 http://127.0.0.1:3007";

/**
 * Dev proxy მხოლოდ პროდაქშენზე გამოქვეყნებული ტურის /v/... გვერდისთვის.
 * /api/tours* ლოკალურია — თორემ create/publish Render sleep-ზე 502-ით იშლება.
 */
function shouldProxyTourPath(pathname) {
  return pathname.startsWith('/v/');
}

function hasLocalTourUiBuild() {
  try {
    return fs.existsSync(TOUR_BUILDER_NEXT);
  } catch {
    return false;
  }
}

/**
 * პროდაქშენის HTML-ში /_next/... ლოკალურ build-თან არ ემთხვევა → 404 → "Loading tour…".
 * აბსოლუტურ პროდაქშენ URL-ებზე გადაწერა.
 */
function rewriteTourHtmlAssets(html) {
  return html
    .replace(/(["'])\/_next\//g, `$1${TARGET}/_next/`)
    .replace(/(["'])\/favicon/g, `$1${TARGET}/favicon`);
}

/**
 * Dev: პროდაქშენზე გამოქვეყნებული ტური localhost:5000-ით (proxy), iframe CSP-ის გარეშე.
 * გამოიყენება მხოლოდ როცა ლოკალური tour-builder build არ არის.
 */
export function attachProductionTourProxy(app) {
  const proxy = createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    pathFilter: (pathname) => shouldProxyTourPath(pathname),
    selfHandleResponse: true,
    on: {
      proxyRes(proxyRes, req, res) {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];

        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          let body = Buffer.concat(chunks);
          const ct = String(proxyRes.headers['content-type'] || '');
          const encoding = proxyRes.headers['content-encoding'];

          // არ ვცვლით შეკუმშულ პასუხს — მხოლოდ HTML ტექსტი
          if (ct.includes('text/html') && !encoding) {
            body = Buffer.from(rewriteTourHtmlAssets(body.toString('utf8')), 'utf8');
            proxyRes.headers['content-length'] = String(body.length);
          }

          proxyRes.headers['content-security-policy'] = DEV_FRAME_ANCESTORS;
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          res.end(body);
        });
      },
      error(err, _req, res) {
        console.error('[tour-proxy]', err.message);
        if (res && !res.headersSent) {
          res.status(502).send('Tour proxy error — is production API reachable?');
        }
      },
    },
  });

  app.use(proxy);
  console.log(`[tour-proxy] dev: /v/ → ${TARGET} (HTML assets rewritten to production)`);
  return true;
}

/**
 * ლოკალურად tour-builder .next თუ არსებობს — /v/ ლოკალური UI-დან (სწორი JS + იგივე Mongo).
 * იძულებითი proxy: TOUR_DEV_PROXY=true
 */
export function shouldUseProductionTourProxy() {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.TOUR_DEV_PROXY === 'false') return false;
  if (process.env.TOUR_DEV_PROXY === 'true') return true;
  if (hasLocalTourUiBuild()) {
    console.log(
      '[tour-proxy] skipped — local tour-builder/.next found (serves /v/ with matching assets)'
    );
    return false;
  }
  return true;
}
