import { createProxyMiddleware } from 'http-proxy-middleware';

const TARGET =
  (process.env.TOUR_PRODUCTION_ORIGIN || 'https://vrgeorgia-api.onrender.com').replace(
    /\/$/,
    ''
  );

const DEV_FRAME_ANCESTORS =
  "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000 http://localhost:3007 http://127.0.0.1:3007";

function isTourUiPath(pathname) {
  return (
    pathname.startsWith('/v/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/embed' ||
    pathname.startsWith('/embed/') ||
    pathname.startsWith('/tours/') ||
    pathname.startsWith('/api/tours') ||
    pathname.startsWith('/api/scenes') ||
    pathname.startsWith('/api/hotspots') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/uploads')
  );
}

/**
 * Dev: პროდაქშენზე გამოქვეყნებული ტური localhost:5000-ით (proxy), iframe CSP-ის გარეშე.
 */
export function attachProductionTourProxy(app) {
  const proxy = createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    pathFilter: (pathname) => isTourUiPath(pathname),
    on: {
      proxyRes(proxyRes) {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        proxyRes.headers['content-security-policy'] = DEV_FRAME_ANCESTORS;
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
  console.log(`[tour-proxy] dev: /v/, /_next/, tour API → ${TARGET}`);
  return true;
}

export function shouldUseProductionTourProxy() {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.TOUR_DEV_PROXY === 'false') return false;
  return true;
}
