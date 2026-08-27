const DEFAULT_LOCAL_API = 'http://localhost:5000';
const PRODUCTION_API = 'https://vrgeorgia-api.onrender.com';

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function isLocalHostname(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

/** პროდაქშენ საიტის ჰოსტები (პარალელური დომენები + Render). */
export function isProductionHostname(host: string): boolean {
  return (
    host === 'vrgeorgia.ge' ||
    host.endsWith('.vrgeorgia.ge') ||
    host === 'vhome.ge' ||
    host.endsWith('.vhome.ge') ||
    host.endsWith('.onrender.com')
  );
}

function isLocalApiUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return isLocalHostname(u.hostname);
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
}

/**
 * API მისამართი.
 * პროდაქშენ ჰოსტზე (vrgeorgia.ge / vhome.ge / onrender) არასდროს ვაბრუნებთ localhost-ს —
 * თუნდაც ბილდში შემთხვევით იყოს ჩაშენებული ლოკალური NEXT_PUBLIC_API_BASE.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();

    // ლოკალური frontend შეიძლება მიმართოს production API-ს (.env.local)
    if (isLocalHostname(host)) {
      if (fromEnv && !isLocalApiUrl(fromEnv)) return normalizeApiBase(fromEnv);
      return normalizeApiBase(`${window.location.protocol}//${host}:5000`);
    }

    if (isProductionHostname(host)) {
      if (fromEnv && !isLocalApiUrl(fromEnv)) return normalizeApiBase(fromEnv);
      return PRODUCTION_API;
    }

    if (fromEnv && !isLocalApiUrl(fromEnv)) return normalizeApiBase(fromEnv);
    // LAN IP / Cloudflare tunnel: იგივე origin — Next.js /api-ს backend-ზე გადაამისამართებს
    return normalizeApiBase(window.location.origin);
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromEnv && !isLocalApiUrl(fromEnv)) return normalizeApiBase(fromEnv);
  if (process.env.NODE_ENV === 'production') return PRODUCTION_API;
  return DEFAULT_LOCAL_API;
}

export const API_BASE = getApiBase();
