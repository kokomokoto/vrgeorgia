import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ka from './locales/ka';

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

const DEFAULT_LANG: SupportedLang = 'ka';
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

function readSavedLang(): SupportedLang {
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

const initialLang = readSavedLang();

i18n.use(initReactI18next).init({
  resources: { [DEFAULT_LANG]: { translation: ka } },
  lng: initialLang,
  fallbackLng: DEFAULT_LANG,
  supportedLngs: [...SUPPORTED_LANGS],
  // en/ru ბანდლები მოგვიანებით ემატება — i18next-მა "missing language" გაფრთხილება არ გამოიტანოს
  partialBundledLanguages: true,
  interpolation: { escapeValue: false },
  react: {
    // addResourceBundle-ის შემდეგ კომპონენტები თავიდან დარენდერდეს
    bindI18nStore: 'added',
  },
});

/**
 * შენახული არაქართული ენის ბანდლის ჩატვირთვა — გამოიძახება hydration-ის *შემდეგ*
 * (`Providers`-ის useEffect-იდან), რომ პირველი კლიენტური რენდერი სერვერის ქართულ
 * HTML-ს ზუსტად დაემთხვეს და hydration mismatch არ მოხდეს. `i18n.language` თავიდანვე
 * შენახული ენაა, ამიტომ API მოთხოვნები მაშინვე სწორ ენაზე მიდის — ორმაგი fetch არ არის.
 */
export function preloadSavedLanguage(): Promise<void> {
  const lang = normalizeLang(i18n.language) ?? DEFAULT_LANG;
  if (lang === DEFAULT_LANG) return Promise.resolve();
  return ensureLanguageLoaded(lang);
}

if (typeof window !== 'undefined') {
  // ენის არჩევანის შენახვა
  i18n.on('languageChanged', (lng) => {
    try {
      const base = normalizeLang(lng);
      if (base) window.localStorage.setItem(STORAGE_KEY, base);
    } catch {
      // ignore
    }
  });
}

export default i18n;
