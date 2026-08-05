/** Homepage visual layout — design-mode editable, persisted in localStorage */

import {
  DEFAULT_THEME_PALETTES,
  normalizeThemePalettes,
  type ThemePalettes,
} from '@/lib/themePalettes';
import {
  createDefaultThemeModes,
  legacyFieldsFromThemeModes,
  normalizeThemeModes,
  type ThemeModeDef,
} from '@/lib/themeModes';

export type { ThemeModeId, ThemePalette, ThemePalettes } from '@/lib/themePalettes';
export { DEFAULT_THEME_PALETTES, THEME_MODE_LABELS } from '@/lib/themePalettes';
export type { ThemeBaseTone, ThemeModeDef } from '@/lib/themeModes';
export {
  createDefaultThemeModes,
  createThemeMode,
  getEnabledThemeModes,
  THEME_BASE_TONE_ICONS,
  THEME_BASE_TONE_LABELS,
} from '@/lib/themeModes';

export const HOME_DESIGN_STORAGE_KEY = 'vhome-home-design-layout-v2';

export type BoxLayout = {
  /** offset from natural position (px) */
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Homepage hero search bar — frame + filter / input / button styles */
export type SearchLayout = BoxLayout & {
  /** Inner padding of the white shell (px) */
  padX: number;
  padY: number;
  /** Gap between filter chips / search / extended button (px) */
  gap: number;
  /** Shell corner radius (px) */
  borderRadius: number;
  /** Shell border / background (#RRGGBB); empty = theme default */
  borderColor?: string;
  background?: string;

  /** Filter trigger label (ფასი, ფართობი…) */
  labelFontSize: number;
  labelFontWeight: number;
  labelColor?: string;
  /** Selected-value line under the label */
  summaryFontSize: number;
  summaryColor?: string;

  triggerMinHeight: number;
  /** Width of each filter trigger button (px) */
  triggerWidth: number;
  triggerPadX: number;
  triggerPadY: number;
  triggerBorderRadius: number;
  triggerBorderColor?: string;
  triggerBackground?: string;

  inputHeight: number;
  inputBorderRadius: number;
  inputBorderColor?: string;
  inputBackground?: string;
  inputFontSize: number;

  buttonHeight: number;
  buttonPadX: number;
  buttonBorderRadius: number;
  buttonBorderColor?: string;
  buttonBackground?: string;
  buttonColor?: string;
  buttonFontSize: number;
  buttonFontWeight: number;
};

/** Property-type grid frame — BoxLayout + inner spacing so borders/hover aren’t clipped */
export type TypePanelLayout = BoxLayout & {
  /** Inner padding (px) around the card grid */
  pad: number;
  /** Gap between category cards (px) */
  gap: number;
  /** Per-category cards (apartment, house, …) — editable like rail items */
  items: TypePanelItem[];
};

/** One property-type category card (filter value = id) */
export type TypePanelItem = {
  /** Filter value / stable id: apartment, house, land, … */
  id: string;
  /** Display label (overrides i18n when non-empty) */
  label: string;
  /** Emoji/icon shown when no cover media */
  icon: string;
  imageId?: string;
  mediaUrl?: string;
  mediaKind?: 'image' | 'gif' | 'video';
  borderRadius?: number;
  labelFontSize?: number;
  labelColor?: string;
  /** Count number under the label */
  countFontSize?: number;
  countColor?: string;
  iconFontSize?: number;
  /**
   * Per theme-mode visual overrides (day / night / …).
   * Resolved as `{ …item, …byMode[modeId] }` — edits in one mode don’t affect others.
   */
  byMode?: Record<string, TypePanelItemModeVisual>;
};

/** Visual fields that can differ per theme mode on a type-panel card */
export type TypePanelItemModeVisual = {
  label?: string;
  icon?: string;
  imageId?: string | null;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'gif' | 'video' | null;
  borderRadius?: number;
  labelFontSize?: number;
  labelColor?: string | null;
  countFontSize?: number;
  countColor?: string | null;
  iconFontSize?: number;
};

export const TYPE_PANEL_LABEL_FONT_DEFAULT = 12;
export const TYPE_PANEL_COUNT_FONT_DEFAULT = 11;
export const TYPE_PANEL_ICON_FONT_DEFAULT = 22;
/** Matches RAIL_RADIUS_ROUNDED */
export const TYPE_PANEL_RADIUS_DEFAULT = 16;

export const DEFAULT_TYPE_PANEL_ITEMS: TypePanelItem[] = [
  { id: 'apartment', label: 'ბინა', icon: '🏢', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'house', label: 'კერძო სახლი', icon: '🏠', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'commercial', label: 'კომერციული', icon: '🏪', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'land', label: 'მიწა', icon: '🌍', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'cottage', label: 'აგარაკი', icon: '🏡', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'hotel', label: 'სასტუმრო', icon: '🏨', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'building', label: 'შენობა', icon: '🏗️', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'warehouse', label: 'საწყობი', icon: '📦', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'parking', label: 'ავტოფარეხი', icon: '🚗', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
  { id: 'business', label: 'ბიზნესი', icon: '💼', borderRadius: TYPE_PANEL_RADIUS_DEFAULT },
];

export type RailItem = {
  id: string;
  href: string;
  label: string;
  hint?: string;
  /** IndexedDB blob id for optional cover image / GIF */
  imageId?: string;
  /** External cover URL (photo, GIF, or video). Wins over imageId when set. */
  mediaUrl?: string;
  mediaKind?: 'image' | 'gif' | 'video';
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
  /**
   * Resolved/runtime: hidden for the active theme mode.
   * Stored per-mode under `byMode[modeId].hidden` — not a shared base field.
   */
  hidden?: boolean;
  /** Per theme-mode visual overrides — same idea as TypePanelItem.byMode */
  byMode?: Record<string, RailItemModeVisual>;
};

/** Visual fields that can differ per theme mode on a rail card */
export type RailItemModeVisual = {
  label?: string;
  hint?: string | null;
  imageId?: string | null;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'gif' | 'video' | null;
  borderRadius?: number;
  labelX?: number;
  labelY?: number;
  labelFontSize?: number;
  labelColor?: string | null;
  hintFontSize?: number;
  hintColor?: string | null;
  /** When true, item is not shown for this mode (still editable in Design Mode) */
  hidden?: boolean;
};

export type RailSectionLayout = {
  x: number;
  y: number;
  gap: number;
  title: string;
  items: RailItem[];
  /** Theme mode ids for which this whole section is hidden from end users */
  hiddenModeIds?: string[];
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

export function clampPx(n: number | undefined, fallback: number, min = 0, max = 200): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function clampFontWeight(n: number | undefined, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  const rounded = Math.round(n / 100) * 100;
  return Math.max(400, Math.min(800, rounded));
}

const HEX6_RE = /^#([0-9a-fA-F]{6})$/;

export function asOptionalHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return HEX6_RE.test(v) ? v : undefined;
}

function asNullableHexColor(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return asOptionalHexColor(value) ?? undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t ? t : null;
}

function asNullableMediaKind(
  value: unknown
): 'image' | 'gif' | 'video' | null | undefined {
  if (value === null) return null;
  if (value === 'image' || value === 'gif' || value === 'video') return value;
  return undefined;
}

/** Strip byMode and apply mode override (null clears optional media/color fields). */
export function resolveTypePanelItemForMode(
  item: TypePanelItem,
  modeId: string
): TypePanelItem {
  const { byMode, ...base } = item;
  const ov = modeId && byMode?.[modeId];
  if (!ov) return { ...base };
  const next: TypePanelItem = { ...base };
  if (ov.label !== undefined) next.label = ov.label;
  if (ov.icon !== undefined) next.icon = ov.icon;
  if (ov.borderRadius !== undefined) next.borderRadius = ov.borderRadius;
  if (ov.labelFontSize !== undefined) next.labelFontSize = ov.labelFontSize;
  if (ov.countFontSize !== undefined) next.countFontSize = ov.countFontSize;
  if (ov.iconFontSize !== undefined) next.iconFontSize = ov.iconFontSize;
  if (ov.labelColor !== undefined) {
    if (ov.labelColor === null) delete next.labelColor;
    else next.labelColor = ov.labelColor;
  }
  if (ov.countColor !== undefined) {
    if (ov.countColor === null) delete next.countColor;
    else next.countColor = ov.countColor;
  }
  if (ov.imageId !== undefined || ov.mediaUrl !== undefined || ov.mediaKind !== undefined) {
    if (ov.imageId === null) delete next.imageId;
    else if (typeof ov.imageId === 'string') next.imageId = ov.imageId;
    if (ov.mediaUrl === null) delete next.mediaUrl;
    else if (typeof ov.mediaUrl === 'string') next.mediaUrl = ov.mediaUrl;
    if (ov.mediaKind === null) delete next.mediaKind;
    else if (ov.mediaKind) next.mediaKind = ov.mediaKind;
  }
  return next;
}

export function resolveRailItemForMode(item: RailItem, modeId: string): RailItem {
  const { byMode, ...base } = item;
  const ov = modeId && byMode?.[modeId];
  if (!ov) return { ...base };
  const next: RailItem = { ...base };
  if (ov.label !== undefined) next.label = ov.label;
  if (ov.hint !== undefined) {
    if (ov.hint === null) delete next.hint;
    else next.hint = ov.hint;
  }
  if (ov.borderRadius !== undefined) next.borderRadius = ov.borderRadius;
  if (ov.labelX !== undefined) next.labelX = ov.labelX;
  if (ov.labelY !== undefined) next.labelY = ov.labelY;
  if (ov.labelFontSize !== undefined) next.labelFontSize = ov.labelFontSize;
  if (ov.hintFontSize !== undefined) next.hintFontSize = ov.hintFontSize;
  if (ov.labelColor !== undefined) {
    if (ov.labelColor === null) delete next.labelColor;
    else next.labelColor = ov.labelColor;
  }
  if (ov.hintColor !== undefined) {
    if (ov.hintColor === null) delete next.hintColor;
    else next.hintColor = ov.hintColor;
  }
  if (ov.imageId !== undefined || ov.mediaUrl !== undefined || ov.mediaKind !== undefined) {
    if (ov.imageId === null) delete next.imageId;
    else if (typeof ov.imageId === 'string') next.imageId = ov.imageId;
    if (ov.mediaUrl === null) delete next.mediaUrl;
    else if (typeof ov.mediaUrl === 'string') next.mediaUrl = ov.mediaUrl;
    if (ov.mediaKind === null) delete next.mediaKind;
    else if (ov.mediaKind) next.mediaKind = ov.mediaKind;
  }
  if (ov.hidden !== undefined) next.hidden = ov.hidden === true;
  return next;
}

export function resolveTypePanelItemsForMode(
  items: TypePanelItem[],
  modeId: string
): TypePanelItem[] {
  return items.map((it) => resolveTypePanelItemForMode(it, modeId));
}

export function resolveRailItemsForMode(items: RailItem[], modeId: string): RailItem[] {
  return items.map((it) => resolveRailItemForMode(it, modeId));
}

/** True when item is marked hidden for this theme mode */
export function isRailItemHiddenForMode(item: RailItem, modeId: string): boolean {
  if (!modeId) return item.hidden === true;
  if (item.byMode?.[modeId]?.hidden === true) return true;
  // Already resolved for a mode (byMode stripped)
  return item.hidden === true;
}

/** Resolve visuals; optionally keep mode-hidden items (Design Mode editor / ghost preview). */
export function resolveVisibleRailItemsForMode(
  items: RailItem[],
  modeId: string,
  opts?: { includeHidden?: boolean }
): RailItem[] {
  const resolved = resolveRailItemsForMode(items, modeId);
  if (opts?.includeHidden) return resolved;
  return resolved.filter((it) => it.hidden !== true);
}

export function isRailSectionHiddenForMode(
  rail: { hiddenModeIds?: string[] } | null | undefined,
  modeId: string
): boolean {
  if (!modeId || !rail?.hiddenModeIds?.length) return false;
  return rail.hiddenModeIds.includes(modeId);
}

/** Returns next hiddenModeIds list (undefined = visible in every mode). */
export function withRailSectionHidden(
  hiddenModeIds: string[] | undefined,
  modeId: string,
  hidden: boolean
): string[] | undefined {
  if (!modeId) return hiddenModeIds;
  const set = new Set((hiddenModeIds || []).filter(Boolean));
  if (hidden) set.add(modeId);
  else set.delete(modeId);
  return set.size > 0 ? Array.from(set) : undefined;
}

export function normalizeHiddenModeIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  return ids.length > 0 ? ids : undefined;
}

function typePanelVisualSnapshot(item: TypePanelItem): TypePanelItemModeVisual {
  return {
    label: item.label,
    icon: item.icon,
    imageId: item.imageId ?? null,
    mediaUrl: item.mediaUrl ?? null,
    mediaKind: item.mediaKind ?? null,
    borderRadius: item.borderRadius,
    labelFontSize: item.labelFontSize,
    labelColor: item.labelColor ?? null,
    countFontSize: item.countFontSize,
    countColor: item.countColor ?? null,
    iconFontSize: item.iconFontSize,
  };
}

function railVisualSnapshot(item: RailItem): RailItemModeVisual {
  return {
    label: item.label,
    hint: item.hint ?? null,
    imageId: item.imageId ?? null,
    mediaUrl: item.mediaUrl ?? null,
    mediaKind: item.mediaKind ?? null,
    borderRadius: item.borderRadius,
    labelX: item.labelX,
    labelY: item.labelY,
    labelFontSize: item.labelFontSize,
    labelColor: item.labelColor ?? null,
    hintFontSize: item.hintFontSize,
    hintColor: item.hintColor ?? null,
    hidden: item.hidden === true,
  };
}

/** Apply a visual patch for one theme mode; href/id stay on the shared base item. */
export function applyTypePanelItemModePatch(
  item: TypePanelItem,
  modeId: string,
  patch: Partial<TypePanelItem>
): TypePanelItem {
  if (!modeId) {
    const next = { ...item, ...patch };
    if ('labelColor' in patch && patch.labelColor === undefined) delete next.labelColor;
    if ('countColor' in patch && patch.countColor === undefined) delete next.countColor;
    if ('imageId' in patch && patch.imageId === undefined) delete next.imageId;
    if ('mediaUrl' in patch && patch.mediaUrl === undefined) delete next.mediaUrl;
    if ('mediaKind' in patch && patch.mediaKind === undefined) delete next.mediaKind;
    return next;
  }
  const resolved = resolveTypePanelItemForMode(item, modeId);
  const merged: TypePanelItem = { ...resolved, ...patch };
  if ('labelColor' in patch && patch.labelColor === undefined) delete merged.labelColor;
  if ('countColor' in patch && patch.countColor === undefined) delete merged.countColor;
  if ('imageId' in patch && patch.imageId === undefined) delete merged.imageId;
  if ('mediaUrl' in patch && patch.mediaUrl === undefined) delete merged.mediaUrl;
  if ('mediaKind' in patch && patch.mediaKind === undefined) delete merged.mediaKind;
  return {
    ...item,
    byMode: {
      ...(item.byMode || {}),
      [modeId]: typePanelVisualSnapshot(merged),
    },
  };
}

export function applyRailItemModePatch(
  item: RailItem,
  modeId: string,
  patch: Partial<RailItem>
): RailItem {
  // href is shared structure across modes
  const hrefPatch =
    patch.href !== undefined ? { href: patch.href } : ({} as Partial<RailItem>);
  const { href: _h, byMode: _b, id: _i, ...visualPatch } = patch;

  if (!modeId) {
    const next = { ...item, ...patch };
    if ('labelColor' in patch && patch.labelColor === undefined) delete next.labelColor;
    if ('hintColor' in patch && patch.hintColor === undefined) delete next.hintColor;
    if ('hint' in patch && patch.hint === undefined) delete next.hint;
    if ('imageId' in patch && patch.imageId === undefined) delete next.imageId;
    if ('mediaUrl' in patch && patch.mediaUrl === undefined) delete next.mediaUrl;
    if ('mediaKind' in patch && patch.mediaKind === undefined) delete next.mediaKind;
    return next;
  }

  const resolved = resolveRailItemForMode(item, modeId);
  const merged: RailItem = { ...resolved, ...visualPatch };
  if ('labelColor' in visualPatch && visualPatch.labelColor === undefined) delete merged.labelColor;
  if ('hintColor' in visualPatch && visualPatch.hintColor === undefined) delete merged.hintColor;
  if ('hint' in visualPatch && visualPatch.hint === undefined) delete merged.hint;
  if ('imageId' in visualPatch && visualPatch.imageId === undefined) delete merged.imageId;
  if ('mediaUrl' in visualPatch && visualPatch.mediaUrl === undefined) delete merged.mediaUrl;
  if ('mediaKind' in visualPatch && visualPatch.mediaKind === undefined) delete merged.mediaKind;

  return {
    ...item,
    ...hrefPatch,
    byMode: {
      ...(item.byMode || {}),
      [modeId]: railVisualSnapshot(merged),
    },
  };
}

function normalizeTypePanelModeVisual(
  raw: Partial<TypePanelItemModeVisual> | null | undefined
): TypePanelItemModeVisual | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: TypePanelItemModeVisual = {};
  if (typeof raw.label === 'string') out.label = raw.label;
  if (typeof raw.icon === 'string') out.icon = raw.icon;
  if (typeof raw.borderRadius === 'number') out.borderRadius = clampRailRadius(raw.borderRadius, 16);
  if (typeof raw.labelFontSize === 'number') {
    out.labelFontSize = clampFontSize(raw.labelFontSize, TYPE_PANEL_LABEL_FONT_DEFAULT, 8, 48);
  }
  if (typeof raw.countFontSize === 'number') {
    out.countFontSize = clampFontSize(raw.countFontSize, TYPE_PANEL_COUNT_FONT_DEFAULT, 8, 32);
  }
  if (typeof raw.iconFontSize === 'number') {
    out.iconFontSize = clampFontSize(raw.iconFontSize, TYPE_PANEL_ICON_FONT_DEFAULT, 12, 64);
  }
  const labelColor = asNullableHexColor(raw.labelColor);
  if (labelColor !== undefined) out.labelColor = labelColor;
  const countColor = asNullableHexColor(raw.countColor);
  if (countColor !== undefined) out.countColor = countColor;
  const imageId = asNullableString(raw.imageId);
  if (imageId !== undefined) out.imageId = imageId;
  const mediaUrl = asNullableString(raw.mediaUrl);
  if (mediaUrl !== undefined) out.mediaUrl = mediaUrl;
  const mediaKind = asNullableMediaKind(raw.mediaKind);
  if (mediaKind !== undefined) out.mediaKind = mediaKind;
  return Object.keys(out).length ? out : null;
}

function normalizeRailModeVisual(
  raw: Partial<RailItemModeVisual> | null | undefined
): RailItemModeVisual | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: RailItemModeVisual = {};
  if (typeof raw.label === 'string') out.label = raw.label;
  const hint = asNullableString(raw.hint);
  if (hint !== undefined) out.hint = hint;
  if (typeof raw.borderRadius === 'number') out.borderRadius = clampRailRadius(raw.borderRadius, 16);
  if (typeof raw.labelX === 'number') out.labelX = clampRailPercent(raw.labelX, 50);
  if (typeof raw.labelY === 'number') out.labelY = clampRailPercent(raw.labelY, 50);
  if (typeof raw.labelFontSize === 'number') {
    out.labelFontSize = clampFontSize(raw.labelFontSize, RAIL_LABEL_FONT_DEFAULT, 10, 48);
  }
  if (typeof raw.hintFontSize === 'number') {
    out.hintFontSize = clampFontSize(raw.hintFontSize, RAIL_HINT_FONT_DEFAULT, 9, 32);
  }
  const labelColor = asNullableHexColor(raw.labelColor);
  if (labelColor !== undefined) out.labelColor = labelColor;
  const hintColor = asNullableHexColor(raw.hintColor);
  if (hintColor !== undefined) out.hintColor = hintColor;
  const imageId = asNullableString(raw.imageId);
  if (imageId !== undefined) out.imageId = imageId;
  const mediaUrl = asNullableString(raw.mediaUrl);
  if (mediaUrl !== undefined) out.mediaUrl = mediaUrl;
  const mediaKind = asNullableMediaKind(raw.mediaKind);
  if (mediaKind !== undefined) out.mediaKind = mediaKind;
  if (typeof raw.hidden === 'boolean') out.hidden = raw.hidden;
  return Object.keys(out).length ? out : null;
}

function normalizeByModeMap<T>(
  raw: unknown,
  normalizeOne: (v: Partial<T> | null | undefined) => T | null
): Record<string, T> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim()) continue;
    const n = normalizeOne(value as Partial<T>);
    if (n) out[key] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Collect blob image ids from base + all byMode overrides */
export function collectItemImageIds(
  items: Array<{ imageId?: string; byMode?: Record<string, { imageId?: string | null }> }>
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (typeof item.imageId === 'string') ids.push(item.imageId);
    if (item.byMode) {
      for (const ov of Object.values(item.byMode)) {
        if (typeof ov.imageId === 'string') ids.push(ov.imageId);
      }
    }
  }
  return ids;
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
  /** IndexedDB blob ids OR external media ids (`ext:v1:…`) for light theme */
  dayImageIds: string[];
  /** Selected day images that participate in slideshow */
  dayRotationIds: string[];
  /** IndexedDB blob ids OR external media ids for twilight / intermediate theme */
  twilightImageIds: string[];
  /** Selected twilight images that participate in slideshow */
  twilightRotationIds: string[];
  /** IndexedDB blob ids OR external media ids for dark theme */
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
export type HeaderItemId =
  | 'brand'
  | 'services'
  | 'about'
  | 'agents'
  | 'upload'
  | 'favorites'
  | 'compare'
  | 'login'
  | 'messages'
  | 'profile'
  | 'admin'
  | 'theme'
  | 'language';

export type HeaderItemPos = {
  /** % of header bar width (0–100) */
  x: number;
  /** % of header bar height (0–100) */
  y: number;
};

export type HeaderItemStyle = {
  /** Font size in px — empty/undefined = brand/nav default */
  fontSize?: number;
  /** Text color #RRGGBB — empty/undefined = brand/nav default */
  color?: string;
};

export const HEADER_ITEM_IDS: HeaderItemId[] = [
  'brand',
  'services',
  'about',
  'agents',
  'upload',
  'favorites',
  'compare',
  'login',
  'messages',
  'profile',
  'admin',
  'theme',
  'language',
];

/** Theme/language — position only (no custom label text) */
export const HEADER_WIDGET_ITEM_IDS: HeaderItemId[] = ['theme', 'language'];

export function headerItemHasTextLabel(id: HeaderItemId): boolean {
  return id !== 'theme' && id !== 'language';
}

export const HEADER_ITEM_LABELS: Record<HeaderItemId, string> = {
  brand: 'ლოგო',
  services: 'მომსახურება',
  about: 'შესახებ',
  agents: 'აგენტები',
  upload: 'განცხადების დამატება',
  favorites: 'ფავორიტები',
  compare: 'შედარება',
  login: 'შესვლა',
  messages: 'შეტყობინებები',
  profile: 'პროფილი',
  admin: 'ადმინ პანელი',
  theme: 'რეჟიმის ღილაკი',
  language: 'ენა',
};

/** Default free-layout spots — spread so right utilities don’t stack */
export const DEFAULT_HEADER_ITEM_POSITIONS: Record<HeaderItemId, HeaderItemPos> = {
  brand: { x: 5, y: 50 },
  services: { x: 15, y: 50 },
  about: { x: 24, y: 50 },
  agents: { x: 33, y: 50 },
  upload: { x: 44, y: 50 },
  favorites: { x: 55, y: 50 },
  compare: { x: 64, y: 50 },
  login: { x: 73, y: 50 },
  messages: { x: 73, y: 50 },
  profile: { x: 82, y: 50 },
  admin: { x: 89, y: 50 },
  theme: { x: 94, y: 50 },
  language: { x: 98.5, y: 50 },
};

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
  messagesLabel: string;
  profileLabel: string;
  adminLabel: string;
  /**
   * Free positions for header text items (% of bar).
   * When empty/undefined → classic flex layout (except Design Mode canvas).
   */
  itemPositions?: Partial<Record<HeaderItemId, HeaderItemPos>>;
  /** Per-item font size / color overrides */
  itemStyles?: Partial<Record<HeaderItemId, HeaderItemStyle>>;
};

export type HomeDesignLayout = {
  version: 2;
  header: HeaderLayout;
  hero: HeroLayout;
  heroText: HeroTextLayout;
  /** Dynamic theme modes (source of truth for palettes + hero galleries) */
  themeModes: ThemeModeDef[];
  /** @deprecated synced from themeModes for older readers */
  themePalettes: ThemePalettes;
  search: SearchLayout;
  /** Deal type chips (იყიდება / ქირავდება / გირავდება) */
  dealBar: BoxLayout;
  /** Property type chips (ბინა, სახლი, აგარაკი…) */
  typePanel: TypePanelLayout;
  serviceRail: RailSectionLayout & {
    /** each circle width */
    itemW: number;
    /** each circle height */
    itemH: number;
  };
  map: BoxLayout;
  quickRail: RailSectionLayout & {
    w: number;
    /** each card min-height */
    itemH: number;
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
  messagesLabel: '',
  profileLabel: '',
  adminLabel: '',
};

export const DEFAULT_SEARCH: SearchLayout = {
  x: 0,
  y: 0,
  w: 1280,
  h: 88,
  padX: 10,
  padY: 8,
  gap: 8,
  borderRadius: 12,
  labelFontSize: 14,
  labelFontWeight: 700,
  summaryFontSize: 12,
  triggerMinHeight: 48,
  triggerWidth: 152,
  triggerPadX: 14,
  triggerPadY: 12,
  triggerBorderRadius: 12,
  inputHeight: 48,
  inputBorderRadius: 8,
  inputFontSize: 14,
  buttonHeight: 48,
  buttonPadX: 12,
  buttonBorderRadius: 8,
  buttonFontSize: 14,
  buttonFontWeight: 500,
};

export const DEFAULT_HOME_DESIGN: HomeDesignLayout = {
  version: 2,
  header: { ...DEFAULT_HEADER },
  hero: { ...DEFAULT_HERO },
  heroText: { ...DEFAULT_HERO_TEXT },
  themeModes: createDefaultThemeModes(),
  themePalettes: {
    day: { ...DEFAULT_THEME_PALETTES.day },
    twilight: { ...DEFAULT_THEME_PALETTES.twilight },
    night: { ...DEFAULT_THEME_PALETTES.night },
  },
  search: { ...DEFAULT_SEARCH },
  dealBar: { x: 0, y: 0, w: 480, h: 48 },
  typePanel: {
    x: 0,
    y: 0,
    w: 1280,
    h: 164,
    pad: 10,
    gap: 12,
    items: DEFAULT_TYPE_PANEL_ITEMS.map((it) => ({ ...it })),
  },
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
  | 'dealBar'
  | 'search'
  | 'typePanel'
  | 'serviceRail'
  | 'map'
  | 'quickRail'
  | 'theme';

export const DESIGNABLE_LABELS: Record<DesignableId, string> = {
  header: 'ჰედერი',
  hero: 'ჰერო ფონი',
  heroText: 'ჰერო ტექსტი',
  dealBar: 'გარიგების ტიპები',
  search: 'სერჩი',
  typePanel: 'ქონების ტიპები',
  serviceRail: 'სერვისის წრეები',
  map: 'რუკა',
  quickRail: 'სწრაფი ბმულები',
  theme: 'რეჟიმები და ფერები',
};

export const DESIGNABLE_HINTS: Record<DesignableId, string> = {
  header: 'ჰედერის სიმაღლე და ფონი; ლოგო/მენიუ — ცალკე ქვეფოლდერებში.',
  hero: 'ჰეროს სიმაღლე, ფოტოები, სლაიდშოუ და რეჟიმების ჩართვა.',
  heroText: 'მთავარი სათაური / ქვესათაური — ტექსტი, ზომა და ფერი.',
  dealBar: 'იყიდება / ქირავდება / გირავდება — პოზიცია და ზომა.',
  search: 'ძიების ბლოკი — ჩარჩო, ფილტრები, სერჩი და გაფართოებული ღილაკი.',
  typePanel: 'ქონების ტიპები — ჩარჩო და კატეგორიები; ფერი/ფოტო რეჟიმის მიხედვით.',
  serviceRail:
    'მარცხენა წრეები — ფორმა/სურათი/ტექსტი; ჩვენება/დამალვა რეჟიმის მიხედვით.',
  map: 'მთავარი გვერდის რუკის ზომა და პოზიცია.',
  quickRail:
    'მარჯვენა სწრაფი ბმულები — ფორმა/სურათი/ტექსტი; ჩვენება/დამალვა რეჟიმის მიხედვით.',
  theme: 'რეჟიმები, ფერები და გადასართავი იკონი (emoji / მედია). ჰედერზე იკონზე კლიკი აქ გახსნის.',
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
  const byMode = normalizeByModeMap(partial?.byMode, normalizeRailModeVisual);
  return {
    id: newId(prefix),
    href: partial?.href || '#',
    label: partial?.label || 'ახალი',
    hint: partial?.hint,
    imageId: partial?.imageId,
    mediaUrl: partial?.mediaUrl,
    mediaKind: partial?.mediaKind,
    borderRadius: clampRailRadius(partial?.borderRadius, defaultRadius),
    labelX: clampRailPercent(partial?.labelX, RAIL_LABEL_DEFAULT.x),
    labelY: clampRailPercent(partial?.labelY, RAIL_LABEL_DEFAULT.y),
    labelFontSize: clampFontSize(partial?.labelFontSize, RAIL_LABEL_FONT_DEFAULT, 10, 48),
    labelColor: asOptionalHexColor(partial?.labelColor),
    hintFontSize: clampFontSize(partial?.hintFontSize, RAIL_HINT_FONT_DEFAULT, 9, 32),
    hintColor: asOptionalHexColor(partial?.hintColor),
    ...(byMode ? { byMode } : {}),
  };
}

function normalizeRailItem(
  it: Partial<RailItem> | null | undefined,
  prefix: 'svc' | 'quick'
): RailItem {
  const defaultRadius = prefix === 'svc' ? RAIL_RADIUS_CIRCLE : RAIL_RADIUS_ROUNDED;
  const byMode = normalizeByModeMap(it?.byMode, normalizeRailModeVisual);
  return {
    id: it?.id || newId(prefix),
    href: prefix === 'svc' ? migrateServiceHref(it?.href || '#') : it?.href || '#',
    label: it?.label || 'ელემენტი',
    hint: it?.hint,
    imageId: typeof it?.imageId === 'string' ? it.imageId : undefined,
    mediaUrl: typeof it?.mediaUrl === 'string' && it.mediaUrl.trim() ? it.mediaUrl.trim() : undefined,
    mediaKind:
      it?.mediaKind === 'image' || it?.mediaKind === 'gif' || it?.mediaKind === 'video'
        ? it.mediaKind
        : undefined,
    borderRadius: clampRailRadius(it?.borderRadius, defaultRadius),
    labelX: clampRailPercent(it?.labelX, RAIL_LABEL_DEFAULT.x),
    labelY: clampRailPercent(it?.labelY, RAIL_LABEL_DEFAULT.y),
    labelFontSize: clampFontSize(it?.labelFontSize, RAIL_LABEL_FONT_DEFAULT, 10, 48),
    labelColor: asOptionalHexColor(it?.labelColor),
    hintFontSize: clampFontSize(it?.hintFontSize, RAIL_HINT_FONT_DEFAULT, 9, 32),
    hintColor: asOptionalHexColor(it?.hintColor),
    ...(byMode ? { byMode } : {}),
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

/** Apply themeModes → legacy hero gallery fields + themePalettes. */
export function syncLegacyThemeFields(layout: HomeDesignLayout): HomeDesignLayout {
  const legacy = legacyFieldsFromThemeModes(layout.themeModes);
  return {
    ...layout,
    themePalettes: legacy.themePalettes,
    hero: {
      ...layout.hero,
      enabledModes: legacy.enabledModes,
      dayImageIds: legacy.dayImageIds,
      dayRotationIds: legacy.dayRotationIds,
      twilightImageIds: legacy.twilightImageIds,
      twilightRotationIds: legacy.twilightRotationIds,
      nightImageIds: legacy.nightImageIds,
      nightRotationIds: legacy.nightRotationIds,
    },
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

export function normalizeSearch(raw?: Partial<SearchLayout> | null): SearchLayout {
  const d = DEFAULT_SEARCH;
  let h = Math.max(56, Math.min(240, Math.round(raw?.h ?? d.h)));
  // ძველი ერთხაზიანი (70) ან ორხაზიანი სერჩი გარიგებით (128) → ახალი სერჩი
  if (!raw?.h || raw.h === 70 || raw.h === 128) {
    h = d.h;
  }
  return {
    x: Math.round(raw?.x ?? d.x),
    y: Math.round(raw?.y ?? d.y),
    w: Math.max(320, Math.min(1600, Math.round(raw?.w ?? d.w))),
    h,
    padX: clampPx(raw?.padX, d.padX, 0, 48),
    padY: clampPx(raw?.padY, d.padY, 0, 48),
    gap: clampPx(raw?.gap, d.gap, 0, 40),
    borderRadius: clampRailRadius(raw?.borderRadius, d.borderRadius),
    borderColor: asOptionalHexColor(raw?.borderColor),
    background: asOptionalHexColor(raw?.background),
    labelFontSize: clampFontSize(raw?.labelFontSize, d.labelFontSize, 10, 28),
    labelFontWeight: clampFontWeight(raw?.labelFontWeight, d.labelFontWeight),
    labelColor: asOptionalHexColor(raw?.labelColor),
    summaryFontSize: clampFontSize(raw?.summaryFontSize, d.summaryFontSize, 9, 20),
    summaryColor: asOptionalHexColor(raw?.summaryColor),
    triggerMinHeight: clampPx(raw?.triggerMinHeight, d.triggerMinHeight, 32, 96),
    triggerWidth: clampPx(raw?.triggerWidth, d.triggerWidth, 72, 280),
    triggerPadX: clampPx(raw?.triggerPadX, d.triggerPadX, 4, 32),
    triggerPadY: clampPx(raw?.triggerPadY, d.triggerPadY, 4, 32),
    triggerBorderRadius: clampRailRadius(raw?.triggerBorderRadius, d.triggerBorderRadius),
    triggerBorderColor: asOptionalHexColor(raw?.triggerBorderColor),
    triggerBackground: asOptionalHexColor(raw?.triggerBackground),
    inputHeight: clampPx(raw?.inputHeight, d.inputHeight, 32, 96),
    inputBorderRadius: clampRailRadius(raw?.inputBorderRadius, d.inputBorderRadius),
    inputBorderColor: asOptionalHexColor(raw?.inputBorderColor),
    inputBackground: asOptionalHexColor(raw?.inputBackground),
    inputFontSize: clampFontSize(raw?.inputFontSize, d.inputFontSize, 10, 24),
    buttonHeight: clampPx(raw?.buttonHeight, d.buttonHeight, 32, 96),
    buttonPadX: clampPx(raw?.buttonPadX, d.buttonPadX, 4, 40),
    buttonBorderRadius: clampRailRadius(raw?.buttonBorderRadius, d.buttonBorderRadius),
    buttonBorderColor: asOptionalHexColor(raw?.buttonBorderColor),
    buttonBackground: asOptionalHexColor(raw?.buttonBackground),
    buttonColor: asOptionalHexColor(raw?.buttonColor),
    buttonFontSize: clampFontSize(raw?.buttonFontSize, d.buttonFontSize, 10, 24),
    buttonFontWeight: clampFontWeight(raw?.buttonFontWeight, d.buttonFontWeight),
  };
}

function normalizeTypePanelItem(
  it: Partial<TypePanelItem> | null | undefined,
  fallback: TypePanelItem
): TypePanelItem {
  const byMode = normalizeByModeMap(it?.byMode ?? fallback.byMode, normalizeTypePanelModeVisual);
  return {
    id: fallback.id,
    label: typeof it?.label === 'string' && it.label.trim() ? it.label.trim() : fallback.label,
    icon: typeof it?.icon === 'string' && it.icon.trim() ? it.icon.trim() : fallback.icon,
    imageId: typeof it?.imageId === 'string' ? it.imageId : undefined,
    mediaUrl: typeof it?.mediaUrl === 'string' && it.mediaUrl.trim() ? it.mediaUrl.trim() : undefined,
    mediaKind:
      it?.mediaKind === 'image' || it?.mediaKind === 'gif' || it?.mediaKind === 'video'
        ? it.mediaKind
        : undefined,
    borderRadius: clampRailRadius(it?.borderRadius, fallback.borderRadius ?? TYPE_PANEL_RADIUS_DEFAULT),
    labelFontSize: clampFontSize(
      it?.labelFontSize,
      fallback.labelFontSize ?? TYPE_PANEL_LABEL_FONT_DEFAULT,
      8,
      48
    ),
    labelColor: asOptionalHexColor(it?.labelColor),
    countFontSize: clampFontSize(
      it?.countFontSize,
      fallback.countFontSize ?? TYPE_PANEL_COUNT_FONT_DEFAULT,
      8,
      32
    ),
    countColor: asOptionalHexColor(it?.countColor),
    iconFontSize: clampFontSize(
      it?.iconFontSize,
      fallback.iconFontSize ?? TYPE_PANEL_ICON_FONT_DEFAULT,
      12,
      64
    ),
    ...(byMode ? { byMode } : {}),
  };
}

function normalizeTypePanel(raw?: Partial<TypePanelLayout> | null): TypePanelLayout {
  const d = DEFAULT_HOME_DESIGN.typePanel;
  const hadPad = raw != null && typeof raw.pad === 'number';
  let h = Math.round(raw?.h ?? d.h);
  // Older layouts had no pad; bump short frames so hover/selected borders fit
  if (!hadPad && h <= 148) h = d.h;

  const savedById = new Map<string, Partial<TypePanelItem>>();
  if (Array.isArray(raw?.items)) {
    for (const it of raw!.items!) {
      if (it && typeof it.id === 'string') savedById.set(it.id, it);
    }
  }

  return {
    x: Math.round(raw?.x ?? d.x),
    y: Math.round(raw?.y ?? d.y),
    w: Math.max(280, Math.min(2400, Math.round(raw?.w ?? d.w))),
    h: Math.max(80, Math.min(480, h)),
    pad: Math.max(0, Math.min(48, Math.round(raw?.pad ?? d.pad))),
    gap: Math.max(0, Math.min(40, Math.round(raw?.gap ?? d.gap))),
    items: DEFAULT_TYPE_PANEL_ITEMS.map((fallback) =>
      normalizeTypePanelItem(savedById.get(fallback.id), fallback)
    ),
  };
}

function asOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function normalizeHeader(raw?: Partial<HeaderLayout> | null): HeaderLayout {
  const itemPositions = normalizeHeaderItemPositions(raw?.itemPositions);
  const itemStyles = normalizeHeaderItemStyles(raw?.itemStyles);
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
    messagesLabel: asOptionalString(raw?.messagesLabel),
    profileLabel: asOptionalString(raw?.profileLabel),
    adminLabel: asOptionalString(raw?.adminLabel),
    ...(itemPositions ? { itemPositions } : {}),
    ...(itemStyles ? { itemStyles } : {}),
  };
}

function normalizeHeaderItemPositions(
  raw: Partial<Record<HeaderItemId, HeaderItemPos>> | null | undefined
): Partial<Record<HeaderItemId, HeaderItemPos>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Partial<Record<HeaderItemId, HeaderItemPos>> = {};
  for (const id of HEADER_ITEM_IDS) {
    const pos = raw[id];
    if (!pos || typeof pos !== 'object') continue;
    out[id] = {
      x: clampRailPercent(pos.x, DEFAULT_HEADER_ITEM_POSITIONS[id].x),
      y: clampRailPercent(pos.y, DEFAULT_HEADER_ITEM_POSITIONS[id].y),
    };
  }
  if (Object.keys(out).length === 0) return undefined;

  // Old free layouts only had 8 items and piled compare/login on the far right.
  // Once utility items exist, fill missing ones and unstick cramped right coords.
  const hasUtilities = Boolean(raw.theme || raw.language || raw.messages || raw.profile);
  if (!hasUtilities) {
    const rightIds: HeaderItemId[] = [
      'compare',
      'login',
      'messages',
      'profile',
      'admin',
      'theme',
      'language',
    ];
    for (const id of rightIds) {
      out[id] = { ...DEFAULT_HEADER_ITEM_POSITIONS[id] };
    }
  } else {
    for (const id of HEADER_ITEM_IDS) {
      if (!out[id]) out[id] = { ...DEFAULT_HEADER_ITEM_POSITIONS[id] };
    }
  }
  return out;
}

function normalizeHeaderItemStyles(
  raw: Partial<Record<HeaderItemId, HeaderItemStyle>> | null | undefined
): Partial<Record<HeaderItemId, HeaderItemStyle>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Partial<Record<HeaderItemId, HeaderItemStyle>> = {};
  for (const id of HEADER_ITEM_IDS) {
    const style = raw[id];
    if (!style || typeof style !== 'object') continue;
    const next: HeaderItemStyle = {};
    if (typeof style.fontSize === 'number' && Number.isFinite(style.fontSize)) {
      next.fontSize = clampFontSize(style.fontSize, id === 'brand' ? 16 : 14, 10, 48);
    }
    const color = asOptionalHexColor(style.color);
    if (color) next.color = color;
    if (next.fontSize !== undefined || next.color) out[id] = next;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function headerHasFreeLayout(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined
): boolean {
  return Boolean(positions && Object.keys(positions).length > 0);
}

export function resolveHeaderItemPos(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  id: HeaderItemId
): HeaderItemPos {
  return positions?.[id] || DEFAULT_HEADER_ITEM_POSITIONS[id];
}

export function headerItemLabelKey(
  id: HeaderItemId
):
  | 'brandLabel'
  | 'servicesLabel'
  | 'aboutLabel'
  | 'agentsLabel'
  | 'uploadLabel'
  | 'favoritesLabel'
  | 'compareLabel'
  | 'loginLabel'
  | 'messagesLabel'
  | 'profileLabel'
  | 'adminLabel'
  | null {
  if (id === 'brand') return 'brandLabel';
  if (id === 'services') return 'servicesLabel';
  if (id === 'about') return 'aboutLabel';
  if (id === 'agents') return 'agentsLabel';
  if (id === 'upload') return 'uploadLabel';
  if (id === 'favorites') return 'favoritesLabel';
  if (id === 'compare') return 'compareLabel';
  if (id === 'login') return 'loginLabel';
  if (id === 'messages') return 'messagesLabel';
  if (id === 'profile') return 'profileLabel';
  if (id === 'admin') return 'adminLabel';
  return null;
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

    const layout: HomeDesignLayout = syncLegacyThemeFields({
      ...DEFAULT_HOME_DESIGN,
      ...parsed,
      version: 2,
      header: normalizeHeader(parsed.header),
      hero: normalizeHero(parsed.hero),
      heroText: normalizeHeroText(parsed.heroText),
      themeModes: normalizeThemeModes(
        (parsed as { themeModes?: unknown }).themeModes,
        parsed.hero,
        parsed.themePalettes
      ),
      themePalettes: normalizeThemePalettes(parsed.themePalettes),
      search: normalizeSearch(parsed.search),
      dealBar: { ...DEFAULT_HOME_DESIGN.dealBar, ...parsed.dealBar },
      typePanel: normalizeTypePanel(parsed.typePanel),
      map: { ...DEFAULT_HOME_DESIGN.map, ...parsed.map },
      serviceRail: {
        ...DEFAULT_HOME_DESIGN.serviceRail,
        ...parsed.serviceRail,
        itemW: parsed.serviceRail?.itemW ?? legacyDiameter ?? DEFAULT_HOME_DESIGN.serviceRail.itemW,
        itemH: parsed.serviceRail?.itemH ?? legacyDiameter ?? DEFAULT_HOME_DESIGN.serviceRail.itemH,
        hiddenModeIds: normalizeHiddenModeIds(
          (parsed.serviceRail as { hiddenModeIds?: unknown } | undefined)?.hiddenModeIds
        ),
        items: serviceItems.map((it) => normalizeRailItem(it, 'svc')),
      },
      quickRail: {
        ...DEFAULT_HOME_DESIGN.quickRail,
        ...parsed.quickRail,
        hiddenModeIds: normalizeHiddenModeIds(
          (parsed.quickRail as { hiddenModeIds?: unknown } | undefined)?.hiddenModeIds
        ),
        items: quickItems.map((it) => normalizeRailItem(it, 'quick')),
      },
    });

    const needsHrefPersist = serviceItems.some(
      (it) => it.href && migrateServiceHref(it.href) !== it.href
    );
    if (
      needsHrefPersist ||
      !parsed.hero ||
      !parsed.heroText ||
      !parsed.themePalettes ||
      !parsed.header ||
      !(parsed as { themeModes?: unknown }).themeModes
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
  const synced = syncLegacyThemeFields(layout);
  window.localStorage.setItem(HOME_DESIGN_STORAGE_KEY, JSON.stringify(synced));
}

export function railStackHeight(itemH: number, gap: number, count: number) {
  if (count <= 0) return itemH;
  return count * itemH + (count - 1) * gap;
}

export function heroTransitionDurationMs(transition: HeroTransition): number {
  return HERO_TRANSITIONS.find((t) => t.id === transition)?.durationMs ?? 1000;
}
