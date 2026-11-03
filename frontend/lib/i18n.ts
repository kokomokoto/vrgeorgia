import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ka from './locales/ka';
import { writeLangCookie } from './siteLang';

/**
 * i18n ინიციალიზაცია.
 *
 * ქართული (ნაგულისხმევი) ბანდლი სტატიკურადაა ჩართული, რომ SSR-ზე და პირველ
 * რენდერზე ყველაფერი თარგმნილი იყოს. EN/RU ცალკე chunk-ებადაა გამოყოფილი და
 * მხოლოდ მაშინ იტვირთება, როცა მომხმარებელი ამ ენას ირჩევს (ან შენახული აქვს) —
 * ასე ჩვეულებრივი ვიზიტორი ~2/3-ით ნაკლებ თარგმანს ტვირთავს.
 */

export const SUPPORTED_LANGS = ['ka', 'en', 'ru'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: SupportedLang = 'ka';
const STORAGE_KEY = 'lang';

type Bundle = Record<string, string>;

/** lazy ლოადერები — თითოეული ცალკე webpack chunk-ია */
const bundleLoaders: Partial<Record<SupportedLang, () => Promise<{ default: Bundle }>>> = {
  en: () => import('./locales/en').then((m) => ({ default: m.default as unknown as Bundle })),
  ru: () => import('./locales/ru').then((m) => ({ default: m.default as unknown as Bundle })),
};

const pendingLoads = new Map<SupportedLang, Promise<void>>();

/** `en-US` → `en`; უცნობი → null */
export function normalizeLang(lng: string | null | undefined): SupportedLang | null {
  const base = String(lng || '')
    .trim()
    .split(/[-_]/)[0]
    .toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? (base as SupportedLang) : null;
}

export function readSavedLang(): SupportedLang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    return normalizeLang(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/**
 * ენის ბანდლი დარწმუნებით ჩატვირთულია (idempotent, პარალელური გამოძახებები ერთ
 * promise-ს იზიარებენ). ქართული ყოველთვის მზადაა.
 */
export function ensureLanguageLoaded(lng: string | null | undefined): Promise<void> {
  const lang = normalizeLang(lng);
  if (!lang || i18n.hasResourceBundle(lang, 'translation')) return Promise.resolve();
  const loader = bundleLoaders[lang];
  if (!loader) return Promise.resolve();

  let pending = pendingLoads.get(lang);
  if (!pending) {
    pending = loader()
      .then((mod) => {
        i18n.addResourceBundle(lang, 'translation', mod.default, true, true);
      })
      .catch((err) => {
        // ჩატვირთვა ჩავარდა (ქსელი/chunk) — ვრჩებით fallback-ზე (ka), შემდეგი ცდა ისევ შესაძლებელია
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] ვერ ჩაიტვირთა "${lang}" ბანდლი`, err);
        }
      })
      .finally(() => {
        pendingLoads.delete(lang);
      });
    pendingLoads.set(lang, pending);
  }
  return pending;
}

/**
 * ენის შეცვლა UI-დან: ჯერ ბანდლი იტვირთება, მერე ენა იცვლება — ასე არასოდეს
 * გამოჩნდება ნახევრად თარგმნილი ეკრანი.
 */
export async function changeAppLanguage(lng: string): Promise<void> {
  const lang = normalizeLang(lng) ?? DEFAULT_LANG;
  await ensureLanguageLoaded(lang);
  await i18n.changeLanguage(lang);
}

i18n.use(initReactI18next).init({
  resources: { [DEFAULT_LANG]: { translation: ka } },
  // The actual request language is applied by `createRequestI18n` (server) /
  // `applyInitialLanguage` (client) before the first render, so server HTML
  // and the first client render always match.
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  supportedLngs: [...SUPPORTED_LANGS],
  // en/ru ბანდლები მოგვიანებით ემატება — i18next-მა "missing language" გაფრთხილება არ გამოიტანოს
  partialBundledLanguages: true,
  interpolation: { escapeValue: false },
  initImmediate: false,
  react: {
    // addResourceBundle-ის შემდეგ კომპონენტები თავიდან დარენდერდეს
    bindI18nStore: 'added',
  },
});

/** Register a server-provided bundle (no-op when already present). */
export function registerBundle(lang: SupportedLang, bundle: Bundle | null | undefined): void {
  if (!bundle || lang === DEFAULT_LANG) return;
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    i18n.addResourceBundle(lang, 'translation', bundle, true, true);
  }
}

/**
 * Client: switch the shared instance to the language the server rendered with.
 * Synchronous when the bundle is present (no backend → i18next resolves inline),
 * so it is safe to call from a `useState` initializer before the first render.
 */
export function applyInitialLanguage(lang: SupportedLang, bundle?: Bundle | null): I18nInstance {
  registerBundle(lang, bundle);
  if (i18n.language !== lang && (lang === DEFAULT_LANG || i18n.hasResourceBundle(lang, 'translation'))) {
    void i18n.changeLanguage(lang);
  }
  return i18n;
}

/**
 * Server: per-request instance so concurrent requests in different languages
 * never share mutable `language` state. Shares the resource store.
 */
export function createRequestI18n(lang: SupportedLang, bundle?: Bundle | null): I18nInstance {
  registerBundle(lang, bundle);
  const instance = i18n.cloneInstance({ lng: lang, initImmediate: false });
  if (instance.language !== lang) {
    void instance.changeLanguage(lang);
  }
  return instance;
}

/**
 * Legacy localStorage preference (pre-cookie visitors): if it differs from the
 * server-rendered language and the URL has no explicit prefix, switch after mount
 * and persist the cookie so the next request renders consistently.
 */
export function preloadSavedLanguage(): Promise<void> {
  const lang = normalizeLang(i18n.language) ?? DEFAULT_LANG;
  if (lang === DEFAULT_LANG) return Promise.resolve();
  return ensureLanguageLoaded(lang);
}

if (typeof window !== 'undefined') {
  // ენის არჩევანის შენახვა (localStorage + cookie სერვერისთვის)
  i18n.on('languageChanged', (lng) => {
    try {
      const base = normalizeLang(lng);
      if (base) {
        window.localStorage.setItem(STORAGE_KEY, base);
        writeLangCookie(base);
        document.documentElement.lang = base;
      }
    } catch {
      // ignore
    }
  });
}

export default i18n;
