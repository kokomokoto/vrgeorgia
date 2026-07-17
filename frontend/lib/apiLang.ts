/** Normalize i18n language for API (?lang=): 'ru-RU' → 'ru' */
export function apiLang(lang?: string | null): string {
  const raw = String(lang || 'ka').trim().toLowerCase();
  const base = raw.split(/[-_]/)[0] || 'ka';
  if (base === 'en' || base === 'ru' || base === 'ka' || base === 'tr' || base === 'az') {
    return base;
  }
  return 'ka';
}
