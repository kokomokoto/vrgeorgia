import { configuredSiteSocials, type SiteSocialLinks } from '@/lib/siteSocialLinks';

/**
 * Single source of truth for public company / contact facts used in
 * Organization schema, footer, contact page, security.txt and llms.txt.
 */
export const SITE_CONTACT = {
  legalName: 'Vhome (Virtual Home Georgia)',
  foundingDate: '2024',
  email: 'info@vhome.ge',
  phoneDisplay: '+995 597 046 604',
  phoneE164: '+995597046604',
  city: 'Tbilisi',
  cityKa: 'თბილისი',
  region: 'Tbilisi',
  country: 'Georgia',
} as const;

/** Public social profiles (official channels). */
export const SITE_SOCIAL_PROFILE_URLS: string[] = [
  'https://www.youtube.com/@vhome.georgia',
  'https://www.tiktok.com/@vhome.ge',
  'https://www.instagram.com/vhome.ge',
  'https://www.facebook.com/vhome.ge',
];

/** Only profile-style URLs (not chat deep-links like wa.me / m.me / t.me). */
function isProfileUrl(href: string): boolean {
  return !/^(https?:\/\/)?(wa\.me|m\.me|t\.me|ig\.me|api\.whatsapp\.com|viber:|tel:|mailto:)/i.test(href);
}

/**
 * sameAs list for schema.org: static official profiles merged with the
 * admin-configured social links (design layout), de-duplicated.
 */
export function buildSameAs(configured?: SiteSocialLinks | null): string[] {
  const out = new Set<string>(SITE_SOCIAL_PROFILE_URLS);
  if (configured) {
    for (const { href } of configuredSiteSocials(configured)) {
      if (isProfileUrl(href)) out.add(href);
    }
  }
  return [...out];
}
