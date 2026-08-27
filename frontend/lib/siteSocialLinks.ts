import { normalizePhoneForMessengers } from '@/lib/phoneLinks';

export const SITE_SOCIAL_NETWORKS = [
  'facebook',
  'instagram',
  'twitter',
  'whatsapp',
  'telegram',
  'youtube',
  'tiktok',
  'linkedin',
] as const;

export type SiteSocialNetwork = (typeof SITE_SOCIAL_NETWORKS)[number];

export type SiteSocialLinks = Record<SiteSocialNetwork, string>;

export const EMPTY_SITE_SOCIAL_LINKS: SiteSocialLinks = {
  facebook: '',
  instagram: '',
  twitter: '',
  whatsapp: '',
  telegram: '',
  youtube: '',
  tiktok: '',
  linkedin: '',
};

export const SITE_SOCIAL_FIELD_LABELS: Record<SiteSocialNetwork, string> = {
  facebook: 'Facebook / Messenger',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

export const SITE_SOCIAL_PLACEHOLDERS: Record<SiteSocialNetwork, string> = {
  facebook: 'https://facebook.com/yourpage ან m.me/yourpage',
  instagram: '@username ან https://instagram.com/username',
  twitter: '@username ან https://x.com/username',
  whatsapp: '+9955… ან https://wa.me/9955…',
  telegram: '@username ან https://t.me/username',
  youtube: '@channel ან https://youtube.com/@channel',
  tiktok: '@username ან https://tiktok.com/@username',
  linkedin: 'https://linkedin.com/in/… ან /company/…',
};

export function normalizeSiteSocialLinks(
  raw?: Partial<SiteSocialLinks> | null
): SiteSocialLinks {
  const next = { ...EMPTY_SITE_SOCIAL_LINKS };
  for (const key of SITE_SOCIAL_NETWORKS) {
    const value = raw?.[key];
    next[key] = typeof value === 'string' ? value.trim() : '';
  }
  return next;
}

function withHttps(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}

function lastPathSegment(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || '');
}

/** პროფილის/ნომრის ველი → ჩათის/მესიჯის URL */
export function siteSocialChatUrl(network: SiteSocialNetwork, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (network === 'whatsapp') {
    const waMe = trimmed.match(/(?:https?:\/\/)?(?:wa\.me)\/(\d+)/i);
    if (waMe) return `https://wa.me/${waMe[1]}`;
    const phoneParam = trimmed.match(/[?&]phone=(\d+)/i);
    if (phoneParam) return `https://wa.me/${phoneParam[1]}`;
    const n = normalizePhoneForMessengers(trimmed);
    if (n) return `https://wa.me/${n.digits}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }

  if (network === 'telegram') {
    const at = trimmed.match(/^@([a-zA-Z0-9_]{3,})$/);
    if (at) return `https://t.me/${at[1]}`;
    const tme = trimmed.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/(\+?[a-zA-Z0-9_]+)/i);
    if (tme) return `https://t.me/${tme[1]}`;
    const n = normalizePhoneForMessengers(trimmed);
    if (n) return `https://t.me/+${n.digits}`;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('tg:')) return withHttps(trimmed);
    if (/^[a-zA-Z][a-zA-Z0-9_]{2,}$/.test(trimmed)) return `https://t.me/${trimmed}`;
    return null;
  }

  if (network === 'facebook') {
    const messenger = trimmed.match(
      /(?:https?:\/\/)?(?:m\.me|www\.messenger\.com\/t)\/([A-Za-z0-9.]+)/i
    );
    if (messenger) return `https://m.me/${messenger[1]}`;
    try {
      const u = new URL(withHttps(trimmed));
      if (/facebook\.com|fb\.com/i.test(u.hostname)) {
        const id = u.searchParams.get('id');
        if (id) return `https://m.me/${id}`;
        const seg = lastPathSegment(u.pathname);
        if (
          seg &&
          !['profile.php', 'people', 'pages', 'share', 'sharer', 'watch'].includes(seg.toLowerCase())
        ) {
          return `https://m.me/${seg}`;
        }
      }
    } catch {
      /* ignore */
    }
    if (/^[A-Za-z0-9.]+$/.test(trimmed)) return `https://m.me/${trimmed}`;
    return withHttps(trimmed);
  }

  if (network === 'twitter') {
    const fromUrl = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/(?:#!\/)?@?([A-Za-z0-9_]+)/i
    );
    const reserved = new Set(['intent', 'share', 'i', 'home', 'messages', 'compose', 'search']);
    if (fromUrl?.[1] && !reserved.has(fromUrl[1].toLowerCase())) {
      return `https://x.com/${fromUrl[1]}`;
    }
    const handle = trimmed.replace(/^@/, '');
    if (/^[A-Za-z0-9_]{1,15}$/.test(handle)) return `https://x.com/${handle}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }

  if (network === 'instagram') {
    const igMe = trimmed.match(/(?:https?:\/\/)?(?:www\.)?ig\.me\/m\/([A-Za-z0-9._]+)/i);
    if (igMe) return `https://ig.me/m/${igMe[1]}`;
    try {
      const u = new URL(withHttps(trimmed));
      if (/instagram\.com/i.test(u.hostname)) {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0]?.toLowerCase() === 'direct') return withHttps(trimmed);
        const reserved = new Set([
          'p',
          'reel',
          'reels',
          'stories',
          'explore',
          'accounts',
          'tv',
          'share',
          'about',
        ]);
        const user = (parts[0] || '').replace(/^@/, '');
        if (user && !reserved.has(user.toLowerCase()) && /^[A-Za-z0-9._]{1,30}$/.test(user)) {
          return `https://ig.me/m/${user}`;
        }
      }
    } catch {
      /* ignore */
    }
    const handle = trimmed.replace(/^@/, '');
    if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return `https://ig.me/m/${handle}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }

  if (network === 'youtube') {
    try {
      const u = new URL(withHttps(trimmed));
      if (/(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$|(?:^|\.)youtube-nocookie\.com$/i.test(u.hostname)) {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0]?.startsWith('@')) return `https://www.youtube.com/${parts[0]}`;
        if (parts[0] === 'channel' && parts[1]) return `https://www.youtube.com/channel/${parts[1]}`;
        if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) {
          return `https://www.youtube.com/${parts[0]}/${parts[1]}`;
        }
        return withHttps(trimmed);
      }
    } catch {
      /* ignore */
    }
    const handle = trimmed.replace(/^@/, '');
    if (/^[A-Za-z0-9._-]{3,}$/.test(handle)) return `https://www.youtube.com/@${handle}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }

  if (network === 'tiktok') {
    try {
      const u = new URL(withHttps(trimmed));
      if (/tiktok\.com/i.test(u.hostname)) {
        const parts = u.pathname.split('/').filter(Boolean);
        const user = (parts[0] || '').replace(/^@/, '');
        const reserved = new Set(['video', 't', 'explore', 'foryou', 'following', 'live', 'music', 'tag']);
        if (user && !reserved.has(user.toLowerCase()) && /^[A-Za-z0-9._]{2,24}$/.test(user)) {
          return `https://www.tiktok.com/@${user}`;
        }
        return withHttps(trimmed);
      }
    } catch {
      /* ignore */
    }
    const handle = trimmed.replace(/^@/, '');
    if (/^[A-Za-z0-9._]{2,24}$/.test(handle)) return `https://www.tiktok.com/@${handle}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }

  return withHttps(trimmed);
}

export function configuredSiteSocials(links: SiteSocialLinks): {
  network: SiteSocialNetwork;
  href: string;
}[] {
  const out: { network: SiteSocialNetwork; href: string }[] = [];
  for (const network of SITE_SOCIAL_NETWORKS) {
    const href = siteSocialChatUrl(network, links[network]);
    if (href) out.push({ network, href });
  }
  return out;
}
