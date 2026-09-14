/** Canonical production site (apex, no www). */
export const DEFAULT_SITE_URL = 'https://vhome.ge';
export const DEFAULT_SITE_HOST = 'vhome.ge';
export const SITE_NAME = 'Vhome';

/**
 * Absolute public site origin for SEO (canonical, sitemap, OG, JSON-LD).
 * Override with NEXT_PUBLIC_SITE_URL when needed (e.g. staging).
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      const u = new URL(fromEnv.includes('://') ? fromEnv : `https://${fromEnv}`);
      return `${u.protocol}//${u.host}`.replace(/\/$/, '');
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_SITE_URL;
}

export function getSiteHost(): string {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return DEFAULT_SITE_HOST;
  }
}

/** Staging / preview hosts should not be indexed. */
export function isNoIndexHost(host?: string): boolean {
  const h = (host || getSiteHost()).toLowerCase();
  return (
    h.startsWith('staging.') ||
    h.includes('onrender.com') ||
    process.env.NEXT_PUBLIC_NOINDEX === '1' ||
    process.env.NEXT_PUBLIC_NOINDEX === 'true'
  );
}
