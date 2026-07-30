/** Homepage visual layout — design-mode editable, persisted in localStorage */

import {
  DEFAULT_THEME_PALETTES,
  normalizeThemePalettes,
  type ThemePalettes,
} from '@/lib/themePalettes';

export type { ThemeModeId, ThemePalette, ThemePalettes } from '@/lib/themePalettes';
export { DEFAULT_THEME_PALETTES, THEME_MODE_LABELS } from '@/lib/themePalettes';

export const HOME_DESIGN_STORAGE_KEY = 'vhome-home-design-layout-v2';

export type BoxLayout = {
  /** offset from natural position (px) */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RailItem = {
  id: string;
  href: string;
  label: string;
  hint?: string;
  /** IndexedDB blob id for optional cover image */
  imageId?: string;
  /** Corner radius in px — 0 = square, large (e.g. 9999) = circle/pill */
  borderRadius?: number;
  /** Label position as % of item box (0–100). Default 50 = center */
  labelX?: number;
  labelY?: number;
  /** Label font size in px */
  labelFontSize?: number;
  /** Label text color (#RRGGBB). Empty/undefined = theme default */
  labelColor?: string;
  /** Hint font size in px */
  hintFontSize?: number;
  /** Hint text color (#RRGGBB) */
  hintColor?: string;
};

export const RAIL_LABEL_DEFAULT = { x: 50, y: 50 } as const;
export const RAIL_LABEL_FONT_DEFAULT = 14;
export const RAIL_HINT_FONT_DEFAULT = 11;
/** Fully rounded — circle when W≈H, pill otherwise */
export const RAIL_RADIUS_CIRCLE = 9999;
export const RAIL_RADIUS_ROUNDED = 16;
export const RAIL_RADIUS_SQUARE = 0;

export function clampRailPercent(n: number | undefined, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function clampRailRadius(n: number | undefined, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

export function clampFontSize(n: number | undefined, fallback: number, min = 10, max = 96): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

const HEX6_RE = /^#([0-9a-fA-F]{6})$/;

export function asOptionalHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return HEX6_RE.test(v) ? v : undefined;
}

/** Hero background slideshow transition */
export type HeroTransition = 'fade-slow' | 'fade-fast' | 'cut' | 'blur';

export const HERO_TRANSITIONS: {
  id: HeroTransition;
  label: string;
  durationMs: number;
}[] = [
  { id: 'fade-slow', label: 'ნელი გადასვლა (fade)', durationMs: 1600 },
  { id: 'fade-fast', label: 'სწრაფი გადასვლა (fade)', durationMs: 400 },
  { id: 'cut', label: 'მყისიერი გადართვა', durationMs: 0 },
  { id: 'blur', label: 'გაბუნდოვნება + შემდეგი', durationMs: 900 },
];

export type HeroLayout = {
  /** design height at 1920-wide reference (matches aspect ratio) */
  h: number;
  /** Which theme modes are available to end users */
  enabledModes: Array<'day' | 'twilight' | 'night'>;
  /** IndexedDB blob ids for light theme */
  dayImageIds: string[];
  /** Selected day images that participate in slideshow */
  dayRotationIds: string[];
  /** IndexedDB blob ids for twilight / intermediate theme */
  twilightImageIds: string[];
  /** Selected twilight images that participate in slideshow */
  twilightRotationIds: string[];
  /** IndexedDB blob ids for dark theme */
  nightImageIds: string[];
  /** Selected night images that participate in slideshow */
  nightRotationIds: string[];
  /** seconds between slides (when gallery has 2+) */
  intervalSec: number;
  transition: HeroTransition;
};

export type HeroTextLayout = BoxLayout & {
  title: string;
  subtitle: string;
  /** Title font size in px */
  titleFontSize: number;
  /** Subtitle font size in px */
  subtitleFontSize: number;
  /** Title color #RRGGBB */
  titleColor: string;
  /** Subtitle color #RRGGBB */
  subtitleColor: string;
};

/** Sticky site header — height, labels, typography */
export type HeaderLayout = {
  /** Bar height in px */
  h: number;
  /** Logo / brand label. Empty = "Vhome" */
  brandLabel: string;
  brandFontSize: number;
  /** Brand color #RRGGBB. Empty = theme accent */
  brandColor: string;
  navFontSize: number;
  /** Nav link color #RRGGBB. Empty = theme header text */
  navColor: string;
  /** Empty string = use i18n default */
  servicesLabel: string;
  aboutLabel: string;
  agentsLabel: string;
  uploadLabel: string;
  favoritesLabel: string;
  compareLabel: string;
  loginLabel: string;
};

export type HomeDesignLayout = {
  version: 2;
  header: HeaderLayout;
  hero: HeroLayout;
  heroText: HeroTextLayout;
  /** Atmosphere colors for day / twilight / night */
  themePalettes: ThemePalettes;
  search: BoxLayout;
  serviceRail: {
    x: number;
    y: number;
    /** each circle width */
    itemW: number;
    /** each circle height */
    itemH: number;
    gap: number;
    title: string;
    items: RailItem[];
  };
  map: BoxLayout;
  quickRail: {
    x: number;
    y: number;
    w: number;
    /** each card min-height */
    itemH: number;
    gap: number;
    title: string;
    items: RailItem[];
  };
};

export const DEFAULT_SERVICE_ITEMS: RailItem[] = [
  { id: 'svc-arch', href: '/services/arch', label: 'არქიტექტურა' },
  { id: 'svc-interior', href: '/services/interior', label: 'ინტერიერი' },
  { id: 'svc-docs', href: '/services/docs', label: 'დოკუმენტები' },
];

export const DEFAULT_QUICK_ITEMS: RailItem[] = [
  {
    id: 'quick-map',
    href: '/map',
    label: 'რუკაზე ძებნა',
    hint: 'სრული რუკის ხედი',
  },
  {
    id: 'quick-agents',
    href: '/agents',
    label: 'აგენტები',
    hint: 'იპოვე სანდო აგენტი',
  },
  {
    id: 'quick-mortgage',
    href: '/mortgage-calculator',
    label: 'იპოთეკის კალკულატორი',
    hint: 'გაანგარიშე გადასახადი',
  },
  {
    id: 'quick-upload',
    href: '/upload',
    label: 'განცხადების დამატება',
    hint: 'განათავსე ობიექტი',
  },
  {
    id: 'quick-compare',
    href: '/compare',
    label: 'შედარება',
    hint: 'შეადარე ობიექტები',
  },
];

export const DEFAULT_HERO: HeroLayout = {
  h: 360,
  enabledModes: ['day', 'twilight', 'night'],
  dayImageIds: [],
  dayRotationIds: [],
  twilightImageIds: [],
  twilightRotationIds: [],
  nightImageIds: [],
  nightRotationIds: [],
  intervalSec: 6,
  transition: 'fade-slow',
};

export const DEFAULT_HERO_TEXT: HeroTextLayout = {
  x: 0,
  y: 0,
  w: 640,
  h: 112,
  title: '',
  subtitle: '',
  titleFontSize: 32,
  subtitleFontSize: 14,
  titleColor: '#ffffff',
  subtitleColor: '#e5e5e5',
};

export const DEFAULT_HEADER: HeaderLayout = {
  h: 60,
  brandLabel: '',
  brandFontSize: 16,
  brandColor: '',
  navFontSize: 14,
  navColor: '',
  servicesLabel: '',
  aboutLabel: '',
  agentsLabel: '',
  uploadLabel: '',
  favoritesLabel: '',
  compareLabel: '',
  loginLabel: '',
};

export const DEFAULT_HOME_DESIGN: HomeDesignLayout = {
  version: 2,
  header: { ...DEFAULT_HEADER },
  hero: { ...DEFAULT_HERO },
  heroText: { ...DEFAULT_HERO_TEXT },
  themePalettes: {
    day: { ...DEFAULT_THEME_PALETTES.day },
    twilight: { ...DEFAULT_THEME_PALETTES.twilight },
    night: { ...DEFAULT_THEME_PALETTES.night },
  },
  search: { x: 0, y: 0, w: 1280, h: 70 },
  serviceRail: {
    x: 0,
    y: 0,
    itemW: 200,
    itemH: 200,
    gap: 16,
    title: 'მომსახურება',
    items: DEFAULT_SERVICE_ITEMS,
  },
  map: { x: 0, y: 0, w: 1280, h: 360 },
  quickRail: {
    x: 0,
    y: 0,
    w: 200,
    itemH: 88,
    gap: 12,
    title: 'სწრაფი ბმულები',
    items: DEFAULT_QUICK_ITEMS,
  },
};

export type DesignableId =
  | 'header'
  | 'hero'
  | 'heroText'
  | 'search'
  | 'serviceRail'
  | 'map'
  | 'quickRail'
  | 'theme';

export const DESIGNABLE_LABELS: Record<DesignableId, string> = {
  header: 'ჰედერი',
  hero: 'ჰერო ფონი',
  heroText: 'ჰერო ტექსტი',
  search: 'სერჩი',
  serviceRail: 'სერვისის წრეები',
  map: 'რუკა',
  quickRail: 'სწრაფი ბმულები',
  theme: 'გვერდის ფერები',
};

export const DESIGNABLE_HINTS: Record<DesignableId, string> = {
  header: 'სიმაღლე, ლოგო/ნავიგაციის ტექსტები, ზომა და ფერები.',
  hero: 'ჰეროს სიმაღლე, ფოტოები, სლაიდშოუ და რეჟიმების ჩართვა.',
  heroText: 'მთავარი სათაური / ქვესათაური — ტექსტი, ზომა და ფერი.',
  search: 'ძიების ბლოკის პოზიცია და ზომა.',
  serviceRail: 'მარცხენა წრეები/ბარათები — ფორმა, სურათი, ტექსტი.',
  map: 'მთავარი გვერდის რუკის ზომა და პოზიცია.',
  quickRail: 'მარჯვენა სწრაფი ბმულები — ფორმა, სურათი, ტექსტი.',
  theme: 'რეჟიმის ფერები: გვერდის ფონი, ბარათები, რუკის სტილი, ნათება.',
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createHeroImageId() {
  return newId('hero');
}

export function createRailItem(
  prefix: 'svc' | 'quick',
  partial?: Partial<RailItem>
): RailItem {
  const defaultRadius = prefix === 'svc' ? RAIL_RADIUS_CIRCLE : RAIL_RADIUS_ROUNDED;
  return {
    id: newId(prefix),
    href: partial?.href || '#',
    label: partial?.label || 'ახალი',
    hint: partial?.hint,
    imageId: partial?.imageId,
    borderRadius: clampRailRadius(partial?.borderRadius, defaultRadius),
    labelX: clampRailPercent(partial?.labelX, RAIL_LABEL_DEFAULT.x),
    labelY: clampRailPercent(partial?.labelY, RAIL_LABEL_DEFAULT.y),
    labelFontSize: clampFontSize(partial?.labelFontSize, RAIL_LABEL_FONT_DEFAULT, 10, 48),
    labelColor: asOptionalHexColor(partial?.labelColor),
    hintFontSize: clampFontSize(partial?.hintFontSize, RAIL_HINT_FONT_DEFAULT, 9, 32),
    hintColor: asOptionalHexColor(partial?.hintColor),
  };
}

function normalizeRailItem(
  it: Partial<RailItem> | null | undefined,
  prefix: 'svc' | 'quick'
): RailItem {
  const defaultRadius = prefix === 'svc' ? RAIL_RADIUS_CIRCLE : RAIL_RADIUS_ROUNDED;
  return {
    id: it?.id || newId(prefix),
    href: prefix === 'svc' ? migrateServiceHref(it?.href || '#') : it?.href || '#',
    label: it?.label || 'ელემენტი',
    hint: it?.hint,
    imageId: typeof it?.imageId === 'string' ? it.imageId : undefined,
    borderRadius: clampRailRadius(it?.borderRadius, defaultRadius),
    labelX: clampRailPercent(it?.labelX, RAIL_LABEL_DEFAULT.x),
    labelY: clampRailPercent(it?.labelY, RAIL_LABEL_DEFAULT.y),
    labelFontSize: clampFontSize(it?.labelFontSize, RAIL_LABEL_FONT_DEFAULT, 10, 48),
    labelColor: asOptionalHexColor(it?.labelColor),
    hintFontSize: clampFontSize(it?.hintFontSize, RAIL_HINT_FONT_DEFAULT, 9, 32),
    hintColor: asOptionalHexColor(it?.hintColor),
  };
}

export function createRailImageId() {
  return newId('rail');
}

/** Old home circles used /services#arch — rewrite to /services/arch */
function migrateServiceHref(href: string): string {
  const m = href.match(/^\/services#([\w-]+)$/);
  return m ? `/services/${m[1]}` : href;
}

function normalizeHero(raw?: Partial<HeroLayout> | null): HeroLayout {
  const transition = raw?.transition;
  const validTransition =
    transition === 'fade-slow' ||
    transition === 'fade-fast' ||
    transition === 'cut' ||
    transition === 'blur'
      ? transition
      : DEFAULT_HERO.transition;
  const dayImageIds = Array.isArray(raw?.dayImageIds)
    ? raw!.dayImageIds.filter((id): id is string => typeof id === 'string')
    : [];
  const twilightImageIds = Array.isArray(raw?.twilightImageIds)
    ? raw!.twilightImageIds.filter((id): id is string => typeof id === 'string')
    : [];
  const nightImageIds = Array.isArray(raw?.nightImageIds)
    ? raw!.nightImageIds.filter((id): id is string => typeof id === 'string')
    : [];
  const dayRotationIds = Array.isArray(raw?.dayRotationIds)
    ? raw!.dayRotationIds.filter((id): id is string => typeof id === 'string')
    : dayImageIds;
  const twilightRotationIds = Array.isArray(raw?.twilightRotationIds)
    ? raw!.twilightRotationIds.filter((id): id is string => typeof id === 'string')
    : twilightImageIds;
  const nightRotationIds = Array.isArray(raw?.nightRotationIds)
    ? raw!.nightRotationIds.filter((id): id is string => typeof id === 'string')
    : nightImageIds;

  const enabledModes = Array.isArray(raw?.enabledModes)
    ? raw!.enabledModes.filter(
        (mode): mode is 'day' | 'twilight' | 'night' =>
          mode === 'day' || mode === 'twilight' || mode === 'night'
      )
    : DEFAULT_HERO.enabledModes;
  const normalizedEnabledModes = enabledModes.length > 0 ? enabledModes : DEFAULT_HERO.enabledModes;

  return {
    h: Math.max(160, Math.min(900, Math.round(raw?.h ?? DEFAULT_HERO.h))),
    enabledModes: normalizedEnabledModes,
    dayImageIds,
    dayRotationIds: dayImageIds.filter((id) => dayRotationIds.includes(id)),
    twilightImageIds,
    twilightRotationIds: twilightImageIds.filter((id) => twilightRotationIds.includes(id)),
    nightImageIds,
    nightRotationIds: nightImageIds.filter((id) => nightRotationIds.includes(id)),
    intervalSec: Math.max(
      2,
      Math.min(120, Math.round(raw?.intervalSec ?? DEFAULT_HERO.intervalSec))
    ),
    transition: validTransition,
  };
}

function normalizeHeroText(raw?: Partial<HeroTextLayout> | null): HeroTextLayout {
  return {
    x: Math.round(raw?.x ?? DEFAULT_HERO_TEXT.x),
    y: Math.round(raw?.y ?? DEFAULT_HERO_TEXT.y),
    w: Math.max(240, Math.min(1200, Math.round(raw?.w ?? DEFAULT_HERO_TEXT.w))),
    h: Math.max(72, Math.min(360, Math.round(raw?.h ?? DEFAULT_HERO_TEXT.h))),
    title: typeof raw?.title === 'string' ? raw.title : DEFAULT_HERO_TEXT.title,
    subtitle: typeof raw?.subtitle === 'string' ? raw.subtitle : DEFAULT_HERO_TEXT.subtitle,
    titleFontSize: clampFontSize(raw?.titleFontSize, DEFAULT_HERO_TEXT.titleFontSize, 12, 96),
    subtitleFontSize: clampFontSize(
      raw?.subtitleFontSize,
      DEFAULT_HERO_TEXT.subtitleFontSize,
      10,
      48
    ),
    titleColor: asOptionalHexColor(raw?.titleColor) || DEFAULT_HERO_TEXT.titleColor,
    subtitleColor: asOptionalHexColor(raw?.subtitleColor) || DEFAULT_HERO_TEXT.subtitleColor,
  };
}

function asOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function normalizeHeader(raw?: Partial<HeaderLayout> | null): HeaderLayout {
  return {
    h: Math.max(44, Math.min(120, Math.round(raw?.h ?? DEFAULT_HEADER.h))),
    brandLabel: asOptionalString(raw?.brandLabel),
    brandFontSize: clampFontSize(raw?.brandFontSize, DEFAULT_HEADER.brandFontSize, 12, 40),
    brandColor: asOptionalHexColor(raw?.brandColor) || '',
    navFontSize: clampFontSize(raw?.navFontSize, DEFAULT_HEADER.navFontSize, 10, 24),
    navColor: asOptionalHexColor(raw?.navColor) || '',
    servicesLabel: asOptionalString(raw?.servicesLabel),
    aboutLabel: asOptionalString(raw?.aboutLabel),
    agentsLabel: asOptionalString(raw?.agentsLabel),
    uploadLabel: asOptionalString(raw?.uploadLabel),
    favoritesLabel: asOptionalString(raw?.favoritesLabel),
    compareLabel: asOptionalString(raw?.compareLabel),
    loginLabel: asOptionalString(raw?.loginLabel),
  };
}

/** Migrate v1 localStorage (diameter-only) → v2 */
function migrateFromV1(raw: Record<string, unknown>): HomeDesignLayout {
  const old = raw as {
    search?: BoxLayout;
    map?: BoxLayout;
    serviceRail?: { x?: number; y?: number; diameter?: number; gap?: number };
    quickRail?: { x?: number; y?: number; w?: number };
  };
  const diameter = old.serviceRail?.diameter ?? 200;
  return {
    ...DEFAULT_HOME_DESIGN,
    search: { ...DEFAULT_HOME_DESIGN.search, ...old.search },
    map: { ...DEFAULT_HOME_DESIGN.map, ...old.map },
    heroText: { ...DEFAULT_HOME_DESIGN.heroText },
    serviceRail: {
      ...DEFAULT_HOME_DESIGN.serviceRail,
      x: old.serviceRail?.x ?? 0,
      y: old.serviceRail?.y ?? 0,
      itemW: diameter,
      itemH: diameter,
      gap: old.serviceRail?.gap ?? 16,
    },
    quickRail: {
      ...DEFAULT_HOME_DESIGN.quickRail,
      x: old.quickRail?.x ?? 0,
      y: old.quickRail?.y ?? 0,
      w: old.quickRail?.w ?? 200,
    },
  };
}

export function loadHomeDesign(): HomeDesignLayout {
  if (typeof window === 'undefined') return DEFAULT_HOME_DESIGN;
  try {
    const rawV2 = window.localStorage.getItem(HOME_DESIGN_STORAGE_KEY);
    const rawV1 = window.localStorage.getItem('vhome-home-design-layout-v1');
    const raw = rawV2 || rawV1;
    if (!raw) return DEFAULT_HOME_DESIGN;
    const parsed = JSON.parse(raw) as Partial<HomeDesignLayout> & { version?: number };

    if (!rawV2 && rawV1) {
      const migrated = migrateFromV1(parsed as Record<string, unknown>);
      saveHomeDesign(migrated);
      return migrated;
    }

    const serviceItems =
      parsed.serviceRail?.items?.length
        ? parsed.serviceRail.items
        : DEFAULT_HOME_DESIGN.serviceRail.items;
    const quickItems =
      parsed.quickRail?.items?.length
        ? parsed.quickRail.items
        : DEFAULT_HOME_DESIGN.quickRail.items;

    // support leftover diameter field from partial saves
    const legacyDiameter = (parsed.serviceRail as { diameter?: number } | undefined)?.diameter;

    const layout: HomeDesignLayout = {
      ...DEFAULT_HOME_DESIGN,
      ...parsed,
      version: 2,
      header: normalizeHeader(parsed.header),
      hero: normalizeHero(parsed.hero),
      heroText: normalizeHeroText(parsed.heroText),
      themePalettes: normalizeThemePalettes(parsed.themePalettes),
      search: { ...DEFAULT_HOME_DESIGN.search, ...parsed.search },
      map: { ...DEFAULT_HOME_DESIGN.map, ...parsed.map },
      serviceRail: {
        ...DEFAULT_HOME_DESIGN.serviceRail,
        ...parsed.serviceRail,
        itemW: parsed.serviceRail?.itemW ?? legacyDiameter ?? DEFAULT_HOME_DESIGN.serviceRail.itemW,
        itemH: parsed.serviceRail?.itemH ?? legacyDiameter ?? DEFAULT_HOME_DESIGN.serviceRail.itemH,
        items: serviceItems.map((it) => normalizeRailItem(it, 'svc')),
      },
      quickRail: {
        ...DEFAULT_HOME_DESIGN.quickRail,
        ...parsed.quickRail,
        items: quickItems.map((it) => normalizeRailItem(it, 'quick')),
      },
    };

    const needsHrefPersist = serviceItems.some(
      (it) => it.href && migrateServiceHref(it.href) !== it.href
    );
    if (
      needsHrefPersist ||
      !parsed.hero ||
      !parsed.heroText ||
      !parsed.themePalettes ||
      !parsed.header
    ) {
      saveHomeDesign(layout);
    }

    return layout;
  } catch {
    return DEFAULT_HOME_DESIGN;
  }
}

export function saveHomeDesign(layout: HomeDesignLayout) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOME_DESIGN_STORAGE_KEY, JSON.stringify(layout));
}

export function railStackHeight(itemH: number, gap: number, count: number) {
  if (count <= 0) return itemH;
  return count * itemH + (count - 1) * gap;
}

export function heroTransitionDurationMs(transition: HeroTransition): number {
  return HERO_TRANSITIONS.find((t) => t.id === transition)?.durationMs ?? 1000;
}
