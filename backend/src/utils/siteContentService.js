import { SiteContent } from '../models/SiteContent.js';
import { DEFAULT_FAQ_ITEMS, DEFAULT_ABOUT_BY_LANG } from './siteContentDefaults.js';

function slugifyId(raw, fallback) {
  const base = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || fallback;
}

function normalizeLocalized(obj = {}) {
  return {
    ka: String(obj.ka ?? ''),
    en: String(obj.en ?? ''),
    ru: String(obj.ru ?? ''),
  };
}

export function normalizeFaqItems(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.map((item, index) => {
    let id = slugifyId(item?.id, `faq-${index + 1}`);
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return {
      id,
      question: normalizeLocalized(item?.question),
      answer: normalizeLocalized(item?.answer),
    };
  });
}

export function normalizeAboutByLang(byLang = {}) {
  const langs = ['ka', 'en', 'ru'];
  const out = {};
  for (const lang of langs) {
    const src = byLang[lang] || {};
    const items = Array.isArray(src.items)
      ? src.items.map((it) => ({
          href: String(it?.href || '/').trim() || '/',
          label: String(it?.label ?? ''),
          desc: String(it?.desc ?? ''),
        }))
      : [];
    out[lang] = {
      title: String(src.title ?? ''),
      intro: String(src.intro ?? ''),
      sectionWhat: String(src.sectionWhat ?? ''),
      items,
      sectionWho: String(src.sectionWho ?? ''),
      whoBody: String(src.whoBody ?? ''),
    };
  }
  return out;
}

export async function ensureFaqContent() {
  let doc = await SiteContent.findOne({ key: 'faq' });
  if (!doc) {
    doc = await SiteContent.create({
      key: 'faq',
      faqItems: DEFAULT_FAQ_ITEMS,
    });
  } else if (!Array.isArray(doc.faqItems) || doc.faqItems.length === 0) {
    doc.faqItems = DEFAULT_FAQ_ITEMS;
    await doc.save();
  }
  return doc;
}

export async function ensureAboutContent() {
  let doc = await SiteContent.findOne({ key: 'about' });
  if (!doc) {
    doc = await SiteContent.create({
      key: 'about',
      aboutByLang: DEFAULT_ABOUT_BY_LANG,
    });
  } else if (!doc.aboutByLang || !doc.aboutByLang.ka) {
    doc.aboutByLang = DEFAULT_ABOUT_BY_LANG;
    await doc.save();
  }
  return doc;
}

export function faqPublicPayload(doc) {
  return {
    items: normalizeFaqItems(doc.faqItems || DEFAULT_FAQ_ITEMS),
    updatedAt: doc.updatedAt || null,
  };
}

export function aboutPublicPayload(doc) {
  return {
    byLang: normalizeAboutByLang(doc.aboutByLang || DEFAULT_ABOUT_BY_LANG),
    updatedAt: doc.updatedAt || null,
  };
}
