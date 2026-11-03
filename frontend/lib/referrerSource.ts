/**
 * Referrer classification for analytics — separates AI assistants
 * (ChatGPT, Perplexity, Claude, Gemini, Copilot, …) from search engines,
 * social networks and ordinary referrals.
 */

export type ReferrerKind = 'direct' | 'ai' | 'search' | 'social' | 'referral' | 'internal';

export type ReferrerSource = {
  kind: ReferrerKind;
  /** Human-readable source name, e.g. "ChatGPT", "Google", "Facebook", or the host. */
  name: string;
  host: string;
};

const AI_SOURCES: Array<[RegExp, string]> = [
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$|(^|\.)chat\.openai\.com$/i, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/i, 'Perplexity'],
  [/(^|\.)claude\.ai$|(^|\.)anthropic\.com$/i, 'Claude'],
  [/(^|\.)gemini\.google\.com$|(^|\.)bard\.google\.com$/i, 'Gemini'],
  [/(^|\.)copilot\.microsoft\.com$|(^|\.)bing\.com\/chat/i, 'Copilot'],
  [/(^|\.)you\.com$/i, 'You.com'],
  [/(^|\.)phind\.com$/i, 'Phind'],
  [/(^|\.)poe\.com$/i, 'Poe'],
  [/(^|\.)meta\.ai$/i, 'Meta AI'],
  [/(^|\.)x\.ai$|(^|\.)grok\.com$/i, 'Grok'],
  [/(^|\.)mistral\.ai$|(^|\.)chat\.mistral\.ai$/i, 'Mistral'],
  [/(^|\.)deepseek\.com$/i, 'DeepSeek'],
  [/(^|\.)duckduckgo\.com$/i, 'DuckDuckGo AI'],
];

const SEARCH_SOURCES: Array<[RegExp, string]> = [
  [/(^|\.)google\./i, 'Google'],
  [/(^|\.)bing\.com$/i, 'Bing'],
  [/(^|\.)yandex\./i, 'Yandex'],
  [/(^|\.)yahoo\./i, 'Yahoo'],
  [/(^|\.)baidu\.com$/i, 'Baidu'],
  [/(^|\.)ecosia\.org$/i, 'Ecosia'],
  [/(^|\.)ask\.com$/i, 'Ask'],
];

const SOCIAL_SOURCES: Array<[RegExp, string]> = [
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|^l\.facebook\.com$|^lm\.facebook\.com$|(^|\.)messenger\.com$/i, 'Facebook'],
  [/(^|\.)instagram\.com$|^l\.instagram\.com$/i, 'Instagram'],
  [/(^|\.)tiktok\.com$/i, 'TikTok'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i, 'YouTube'],
  [/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/i, 'Telegram'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/i, 'LinkedIn'],
  [/(^|\.)twitter\.com$|(^|\.)x\.com$|^t\.co$/i, 'X'],
  [/(^|\.)pinterest\./i, 'Pinterest'],
  [/(^|\.)reddit\.com$/i, 'Reddit'],
  [/(^|\.)whatsapp\.com$/i, 'WhatsApp'],
  [/(^|\.)vk\.com$/i, 'VK'],
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Some assistants tag outbound links with utm_source (e.g. utm_source=chatgpt.com). */
function aiFromUtm(search: string): string | null {
  try {
    const params = new URLSearchParams(search || '');
    const utm = (params.get('utm_source') || params.get('ref') || '').toLowerCase();
    if (!utm) return null;
    for (const [re, name] of AI_SOURCES) {
      if (re.test(utm) || utm.includes(name.toLowerCase().replace(/\s+/g, ''))) return name;
    }
    if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(utm)) return utm;
  } catch {
    /* ignore */
  }
  return null;
}

export function classifyReferrer(referrer: string, search = '', ownHost?: string): ReferrerSource {
  const utmAi = aiFromUtm(search);
  const host = hostOf(referrer);
  const self = (ownHost || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();

  if (utmAi) return { kind: 'ai', name: utmAi, host: host || utmAi };
  if (!host) return { kind: 'direct', name: 'direct', host: '' };
  if (self && (host === self || host.endsWith(`.${self}`))) return { kind: 'internal', name: 'internal', host };

  for (const [re, name] of AI_SOURCES) if (re.test(host)) return { kind: 'ai', name, host };
  for (const [re, name] of SEARCH_SOURCES) if (re.test(host)) return { kind: 'search', name, host };
  for (const [re, name] of SOCIAL_SOURCES) if (re.test(host)) return { kind: 'social', name, host };
  return { kind: 'referral', name: host, host };
}
