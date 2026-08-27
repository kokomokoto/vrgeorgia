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

export async function ensureHomeDesignContent() {
  let doc = await SiteContent.findOne({ key: 'home-design' });
  if (!doc) {
    doc = await SiteContent.create({
      key: 'home-design',
      layout: null,
      presets: [],
    });
  }
  if (!Array.isArray(doc.presets)) {
    doc.presets = [];
    doc.markModified('presets');
    await doc.save();
  }
  return doc;
}

/**
 * @param {unknown} layout
 * @returns {object | null}
 */
export function normalizeHomeDesignLayout(layout) {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return null;
  return layout;
}

const MAX_HOME_DESIGN_PRESETS = 12;
const PRESET_NAME_MAX = 48;

function newPresetId() {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {unknown} raw
 * @returns {{ id: string, name: string, layout: object, createdAt: string, updatedAt: string }[]}
 */
export function normalizeHomeDesignPresets(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const layout = normalizeHomeDesignLayout(item.layout);
    if (!layout) continue;
    const id = slugifyId(item.id, newPresetId());
    const name = String(item.name || 'დეფაულტი').trim().slice(0, PRESET_NAME_MAX) || 'დეფაულტი';
    const createdAt =
      typeof item.createdAt === 'string' && item.createdAt
        ? item.createdAt
        : new Date().toISOString();
    const updatedAt =
      typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : createdAt;
    out.push({ id, name, layout, createdAt, updatedAt });
    if (out.length >= MAX_HOME_DESIGN_PRESETS) break;
  }
  return out;
}

export function homeDesignPublicPayload(doc) {
  return {
    layout: normalizeHomeDesignLayout(doc.layout) || null,
    updatedAt: doc.updatedAt || null,
  };
}

/** Admin payload includes named presets */
export function homeDesignAdminPayload(doc) {
  return {
    layout: normalizeHomeDesignLayout(doc.layout) || null,
    presets: normalizeHomeDesignPresets(doc.presets),
    updatedAt: doc.updatedAt || null,
    maxPresets: MAX_HOME_DESIGN_PRESETS,
  };
}

export { MAX_HOME_DESIGN_PRESETS, PRESET_NAME_MAX };
