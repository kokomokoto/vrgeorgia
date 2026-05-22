const DEFAULT_LOCAL_API = 'http://localhost:5000';

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/**
 * API მისამართი.
 * პროდაქშენი: NEXT_PUBLIC_API_BASE (მაგ. Render backend).
 * LAN/dev: იგივე hostname, პორტი 5000 — თუ env არ არის მითითებული.
 */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE;
  if (fromEnv) return normalizeApiBase(fromEnv);

  if (typeof window !== 'undefined') {
    return normalizeApiBase(`${window.location.protocol}//${window.location.hostname}:5000`);
  }

  return DEFAULT_LOCAL_API;
}

export const API_BASE = getApiBase();
