export const DEFAULT_BRAND_LOGO_SRC = '/images/vhome-icon.png';

export type SiteBranding = {
  logoUrl: string;
  updatedAt?: string | null;
};

export function resolveBrandLogoSrc(logoUrl?: string | null): string {
  const raw = String(logoUrl || '').trim();
  return raw || DEFAULT_BRAND_LOGO_SRC;
}
