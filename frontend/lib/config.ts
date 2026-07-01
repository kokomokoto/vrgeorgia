const DEFAULT_LOCAL_API = 'http://localhost:5000';
const PRODUCTION_API = 'https://vrgeorgia-api.onrender.com';

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function isLocalHostname(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

function isProductionHostname(host: string): boolean {
  return (
    host === 'vrgeorgia.ge' ||
    host.endsWith('.vrgeorgia.ge') ||
    host.endsWith('.onrender.com')
  );
}

/**
 * API მისამართი.
 * პროდაქშენი: NEXT_PUBLIC_API_BASE (მაგ. Render backend).
 * LAN/dev: იგივე hostname, პორტი 5000 — თუ env არ არის მითითებული.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (isLocalHostname(host)) {
      return normalizeApiBase(`${window.location.protocol}//${host}:5000`);
    }
    const fromEnv = process.env.NEXT_PUBLIC_API_BASE;
    if (fromEnv) return normalizeApiBase(fromEnv);
    if (isProductionHostname(host)) return PRODUCTION_API;
    return normalizeApiBase(`${window.location.protocol}//${host}:5000`);
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_BASE;
  if (fromEnv) return normalizeApiBase(fromEnv);
  if (process.env.NODE_ENV === 'production') return PRODUCTION_API;
  return DEFAULT_LOCAL_API;
}

export const API_BASE = getApiBase();
