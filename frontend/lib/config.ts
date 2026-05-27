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
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // localhost-ზე გახსნისას ყოველთვის ადგილობრივი backend (ძველი LAN IP .env-ში აღარ „გატეხავს“)
    if (host === 'localhost' || host === '127.0.0.1') {
      return normalizeApiBase(`${window.location.protocol}//${host}:5000`);
    }
    const fromEnv = process.env.NEXT_PUBLIC_API_BASE;
    if (fromEnv) return normalizeApiBase(fromEnv);
    return normalizeApiBase(`${window.location.protocol}//${host}:5000`);
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_BASE;
  if (fromEnv) return normalizeApiBase(fromEnv);
  return DEFAULT_LOCAL_API;
}

export const API_BASE = getApiBase();
