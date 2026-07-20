import { Property } from '../models/Property.js';
import { translateText, detectLang } from '../services/translate.js';

/** Fields that get cached translations. */
export const TRANSLATABLE_FIELDS = ['title', 'desc', 'city', 'street'];
/** Site languages we display in. */
export const AUTO_TRANSLATE_LANGS = ['ka', 'en', 'ru'];

const translationInFlight = new Set();

export function pickLanguage(req) {
  const raw = (req.query.lang || req.headers['accept-language'] || 'ka').toString();
  const lang = raw.split(',')[0].trim().toLowerCase().split(/[-_]/)[0];
  const supported = ['ka', 'en', 'ru', 'tr', 'az'];
  return supported.includes(lang) ? lang : 'ka';
}

export function getTranslationEntry(translations, lang) {
  if (!translations) return null;
  if (typeof translations.get === 'function') return translations.get(lang) || null;
  return translations[lang] || null;
}

/** A field needs translation for `lang` only if it holds text in a different language. */
export function fieldNeedsTranslation(text, lang) {
  const value = text ? String(text).trim() : '';
  if (!value) return false;
  return detectLang(value) !== lang;
}

export function applyTranslation(property, lang) {
  const t = getTranslationEntry(property.translations, lang);
  if (!t) return property;
  const out = { ...property };
  for (const f of TRANSLATABLE_FIELDS) {
    if (t[f] && String(t[f]).trim()) out[f] = t[f];
  }
  return out;
}

export function hasCompleteTranslation(property, lang) {
  const t = getTranslationEntry(property.translations, lang);
  return TRANSLATABLE_FIELDS.every((f) => {
    if (!fieldNeedsTranslation(property[f], lang)) return true;
    return t && t[f] && String(t[f]).trim();
  });
}

/**
 * Translate a property's user-facing text into the given languages ONCE and persist
 * the result on the document (translations map). Safe to call fire-and-forget.
 */
export async function ensurePropertyTranslations(propertyId, langs = AUTO_TRANSLATE_LANGS) {
  const id = String(propertyId);
  const targets = (Array.isArray(langs) ? langs : [langs]).filter(Boolean);
  if (!targets.length) return null;

  const doc = await Property.findById(id)
    .select([...TRANSLATABLE_FIELDS, 'translations'].join(' '))
    .lean();
  if (!doc) return null;

  const result = { ...(doc.translations || {}) };
  const missing = targets.filter((lang) => !hasCompleteTranslation(doc, lang));
  if (!missing.length) return result;

  const setOps = {};
  for (const lang of missing) {
    const guardKey = `${id}:${lang}`;
    if (translationInFlight.has(guardKey)) continue;
    translationInFlight.add(guardKey);
    try {
      const existing = getTranslationEntry(doc.translations, lang) || {};
      const entry = { ...existing };
      for (const field of TRANSLATABLE_FIELDS) {
        const src = doc[field];
        if (!fieldNeedsTranslation(src, lang)) continue;
        if (entry[field] && String(entry[field]).trim()) continue;
        const translated = await translateText(src, lang);
        if (translated && translated !== src) entry[field] = translated;
      }
      if (Object.keys(entry).length) {
        setOps[`translations.${lang}`] = entry;
        result[lang] = entry;
      }
    } catch (err) {
      console.warn(`ensurePropertyTranslations ${guardKey} failed:`, err?.message || err);
    } finally {
      translationInFlight.delete(guardKey);
    }
  }

  if (Object.keys(setOps).length) {
    await Property.updateOne({ _id: id }, { $set: setOps });
  }
  return result;
}

export function scheduleTranslations(propertyId, langs = AUTO_TRANSLATE_LANGS) {
  ensurePropertyTranslations(propertyId, langs).catch((err) =>
    console.warn('scheduleTranslations failed:', err?.message || err)
  );
}

export function scheduleListTranslations(properties, lang, cap = 60) {
  let count = 0;
  for (const p of properties) {
    if (count >= cap) break;
    if (hasCompleteTranslation(p, lang)) continue;
    count += 1;
    scheduleTranslations(p._id, [lang]);
  }
}

/**
 * Await missing translations for the first N incomplete items so the current
 * response uses the site language.
 */
export async function fillMissingTranslationsForResponse(properties, lang, awaitCap = 25) {
  const incomplete = properties.filter((p) => !hasCompleteTranslation(p, lang)).slice(0, awaitCap);
  if (!incomplete.length) return;
  await Promise.all(
    incomplete.map(async (p) => {
      try {
        const translations = await ensurePropertyTranslations(p._id, [lang]);
        if (translations) p.translations = translations;
      } catch (err) {
        console.warn('list translate failed:', p._id, err?.message || err);
      }
    })
  );
}

/** საჯაროდ არ ჩანს საკადასტრო, თუ მონიშნულია დამალვა */
export function stripHiddenCadastral(p) {
  if (!p?.cadastralHidden) return p;
  const { cadastralCode, cadastralHidden, ...rest } = p;
  return rest;
}
