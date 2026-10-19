import { SiteContent } from '../models/SiteContent.js';
import {
  DEFAULT_FAQ_ITEMS,
  DEFAULT_ABOUT_BY_LANG,
  DEFAULT_SERVICES_CONTENT,
  DEFAULT_BRANDING,
} from './siteContentDefaults.js';

const SERVICE_STYLE_KEYS = new Set([
  'arch',
  'docs',
  'planning',
  'interior',
  'landscape',
  'vis',
  'heritage',
  'consult',
]);

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

export function normalizeServicesContent(raw = {}) {
  const pageSrc = raw.page || {};
  const page = {
    title: normalizeLocalized(pageSrc.title),
    lead: normalizeLocalized(pageSrc.lead),
    footerNote: normalizeLocalized(pageSrc.footerNote),
  };

  const seen = new Set();
  const sectionsIn = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = sectionsIn.map((item, index) => {
    let id = slugifyId(item?.id, `service-${index + 1}`);
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const styleRaw = String(item?.styleKey || 'arch').trim();
    const styleKey = SERVICE_STYLE_KEYS.has(styleRaw) ? styleRaw : 'arch';
    const imageUrl = String(item?.imageUrl || '').trim().slice(0, 2000);
    return {
      id,
      styleKey,
      featured: Boolean(item?.featured),
      hidden: Boolean(item?.hidden),
      imageUrl,
      title: normalizeLocalized(item?.title),
      body: normalizeLocalized(item?.body),
    };
  });

  return { page, sections };
}

export async function ensureServicesContent() {
  let doc = await SiteContent.findOne({ key: 'services' });
  if (!doc) {
    doc = await SiteContent.create({
      key: 'services',
      servicesPage: DEFAULT_SERVICES_CONTENT.page,
      servicesSections: DEFAULT_SERVICES_CONTENT.sections,
    });
  } else if (!Array.isArray(doc.servicesSections) || doc.servicesSections.length === 0) {
    doc.servicesPage = DEFAULT_SERVICES_CONTENT.page;
    doc.servicesSections = DEFAULT_SERVICES_CONTENT.sections;
    await doc.save();
  }
  return doc;
}

export function servicesAdminPayload(doc) {
  const normalized = normalizeServicesContent({
    page: doc.servicesPage || DEFAULT_SERVICES_CONTENT.page,
    sections: doc.servicesSections || DEFAULT_SERVICES_CONTENT.sections,
  });
  if (normalized.sections.length === 0) {
    return {
      ...normalizeServicesContent(DEFAULT_SERVICES_CONTENT),
      updatedAt: doc.updatedAt || null,
    };
  }
  return {
    ...normalized,
    updatedAt: doc.updatedAt || null,
  };
}

/** პუბლიკური — დამალული სექციები ამოიღება */
export function servicesPublicPayload(doc) {
  const full = servicesAdminPayload(doc);
  return {
    ...full,
    sections: full.sections.filter((s) => !s.hidden),
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

export function normalizeBranding(raw = {}) {
  const logoUrl = String(raw?.logoUrl ?? '').trim().slice(0, 2000);
  return { logoUrl };
}

export async function ensureBrandingContent() {
  let doc = await SiteContent.findOne({ key: 'branding' });
  if (!doc) {
    doc = await SiteContent.create({
      key: 'branding',
      branding: DEFAULT_BRANDING,
    });
  } else if (!doc.branding) {
    doc.branding = DEFAULT_BRANDING;
    await doc.save();
  }
  return doc;
}

export function brandingPublicPayload(doc) {
  return {
    ...normalizeBranding(doc.branding || DEFAULT_BRANDING),
    updatedAt: doc.updatedAt || null,
  };
}

export { MAX_HOME_DESIGN_PRESETS, PRESET_NAME_MAX };
