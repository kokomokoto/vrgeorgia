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

import {
  EMPTY_SITE_SOCIAL_LINKS,
  normalizeSiteSocialLinks,
  type SiteSocialLinks,
} from '@/lib/siteSocialLinks';

export type { SiteSocialLinks } from '@/lib/siteSocialLinks';
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
  /** Phone-only nudge from natural flow (px). Negative Y pulls blocks closer. */
  mobileX?: number;
  mobileY?: number;
  /** Layer opacity 0–1. Default 1 (fully visible). */
  opacity?: number;
};

export const OPACITY_DEFAULT = 1;

/** Element/layer opacity — 0 = invisible, 1 = solid. */
export function clampOpacity(n: number | undefined, fallback = OPACITY_DEFAULT): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

export const MOBILE_NUDGE_X_MIN = -120;
export const MOBILE_NUDGE_X_MAX = 360;
export const MOBILE_NUDGE_Y_MIN = -80;
export const MOBILE_NUDGE_Y_MAX = 400;

export function clampMobileNudgeX(n: number | undefined, fallback = 0): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(MOBILE_NUDGE_X_MIN, Math.min(MOBILE_NUDGE_X_MAX, v));
}

export function clampMobileNudgeY(n: number | undefined, fallback = 0): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(MOBILE_NUDGE_Y_MIN, Math.min(MOBILE_NUDGE_Y_MAX, v));
}

/**
 * Phone flex-stack spacing tweaks only.
 * Legacy designs stored large mobileY for absolute `top` pull — those become
 * overlapping margins in the stack model, so wipe values outside a small range.
 */
export const STACK_MOBILE_Y_MIN = -48;
export const STACK_MOBILE_Y_MAX = 64;
export const STACK_MOBILE_Y_LEGACY_ABS = 40;

export function clampStackMobileNudgeY(n: number | undefined, fallback = 0): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  if (Math.abs(v) > STACK_MOBILE_Y_LEGACY_ABS) return 0;
  return Math.max(STACK_MOBILE_Y_MIN, Math.min(STACK_MOBILE_Y_MAX, v));
}

export function clampStackMobileNudgeX(n: number | undefined, fallback = 0): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  if (Math.abs(v) > 40) return 0;
  return Math.max(-24, Math.min(24, v));
}

export function normalizeBoxLayout(
  raw: Partial<BoxLayout> | null | undefined,
  fallback: BoxLayout,
  opts?: { maxH?: number; stackMobile?: boolean }
): BoxLayout {
  let h = Math.max(40, Math.round(raw?.h ?? fallback.h));
  if (opts?.maxH != null) {
    // Phone SE-resize used to inflate shared desktop height — snap back
    if (h > opts.maxH * 1.75) h = fallback.h;
    else h = Math.min(opts.maxH, h);
  }
  const stack = opts?.stackMobile === true;
  return {
    x: Math.round(raw?.x ?? fallback.x),
    y: Math.round(raw?.y ?? fallback.y),
    w: Math.max(40, Math.round(raw?.w ?? fallback.w)),
    h,
    mobileX: stack
      ? clampStackMobileNudgeX(raw?.mobileX, fallback.mobileX ?? 0)
      : clampMobileNudgeX(raw?.mobileX, fallback.mobileX ?? 0),
    mobileY: stack
      ? clampStackMobileNudgeY(raw?.mobileY, fallback.mobileY ?? 0)
      : clampMobileNudgeY(raw?.mobileY, fallback.mobileY ?? 0),
    opacity: clampOpacity(raw?.opacity, fallback.opacity ?? OPACITY_DEFAULT),
  };
}

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

  /**
   * Per-control box sizes (ფასი / ფართობი / ქალაქი / ოთახები / ძიება / გაფართოებული / ძიების ღილაკი).
   * Falls back to triggerWidth / triggerMinHeight / inputHeight / buttonHeight when missing.
   */
  controls: Record<SearchControlId, SearchControlLayout>;
};

export const SEARCH_CONTROL_IDS = [
  'price',
  'area',
  'city',
  'rooms',
  'query',
  'advanced',
  'submit',
] as const;
export type SearchControlId = (typeof SEARCH_CONTROL_IDS)[number];

export type SearchControlLayout = {
  w: number;
  h: number;
  opacity?: number;
};

export const SEARCH_CONTROL_LABELS: Record<SearchControlId, string> = {
  price: 'ფასი',
  area: 'ფართობი',
  city: 'ქალაქი',
  rooms: 'ოთახები',
  query: 'ტექსტური ძიება',
  advanced: 'გაფართოებული ძიება',
  submit: 'ძიების ღილაკი',
};

export const DEAL_CHIP_IDS = ['sale', 'rent', 'mortgage'] as const;
export type DealChipId = (typeof DEAL_CHIP_IDS)[number];

export type DealChipLayout = {
  w: number;
  h: number;
  opacity?: number;
};

export type DealBarLayout = BoxLayout & {
  /** Gap between deal chips (px) */
  gap: number;
  chips: Record<DealChipId, DealChipLayout>;
};

export const DEAL_CHIP_LABELS: Record<DealChipId, string> = {
  sale: 'იყიდება',
  rent: 'ქირავდება',
  mortgage: 'გირავდება',
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
  /** Label position as % of the card (0–100). Default 50 / 54 */
  labelX?: number;
  labelY?: number;
  /** Count number position as % of the card */
  countX?: number;
  countY?: number;
  /** Icon position as % of the card (shown when there is no cover media) */
  iconX?: number;
  iconY?: number;
  /** Cover media size as % of the card. 100 = fill, >100 = zoom in */
  mediaScale?: number;
  /** Cover media focal point as % of the card (50 = centered) */
  mediaX?: number;
  mediaY?: number;
  /** When true, the category name wraps. Default: one line. */
  labelWrap?: boolean;
  /** Wrap box width as % of the card (only when labelWrap). */
  labelMaxW?: number;
  /** Hide the category name on the card. Default false (shown). */
  labelHidden?: boolean;
  /** Hide the listing count on the card. Default false (shown). */
  countHidden?: boolean;
  /**
   * Dark gradient over cover media (0–1). Bottom is strongest so labels stay readable.
   * 0 = no overlay. Default 0.55.
   */
  overlayOpacity?: number;
  /** Card opacity 0–1. Default 1. */
  opacity?: number;
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
  labelX?: number;
  labelY?: number;
  countX?: number;
  countY?: number;
  iconX?: number;
  iconY?: number;
  mediaScale?: number;
  mediaX?: number;
  mediaY?: number;
  labelWrap?: boolean;
  labelMaxW?: number;
  labelHidden?: boolean;
  countHidden?: boolean;
  overlayOpacity?: number;
  opacity?: number;
};

export const TYPE_PANEL_LABEL_FONT_DEFAULT = 12;
export const TYPE_PANEL_COUNT_FONT_DEFAULT = 11;
export const TYPE_PANEL_ICON_FONT_DEFAULT = 22;
/** Matches RAIL_RADIUS_ROUNDED */
export const TYPE_PANEL_RADIUS_DEFAULT = 16;
export const TYPE_PANEL_LABEL_POS_DEFAULT = { x: 50, y: 54 } as const;
export const TYPE_PANEL_COUNT_POS_DEFAULT = { x: 50, y: 76 } as const;
export const TYPE_PANEL_ICON_POS_DEFAULT = { x: 50, y: 32 } as const;
export const TYPE_PANEL_MEDIA_POS_DEFAULT = { x: 50, y: 50 } as const;
export const TYPE_PANEL_MEDIA_SCALE_DEFAULT = 100;
/** Dark fade on cover photos so white labels stay readable. 0 = off, 0.55 = current look. */
export const TYPE_PANEL_OVERLAY_DEFAULT = 0.55;
export const TYPE_PANEL_LABEL_MAX_W_DEFAULT = 140;

/** Cover zoom inside a type card — 50% = shrink, 100% = fill, 400% = tight crop. */
export function clampMediaScale(n: number | undefined, fallback = TYPE_PANEL_MEDIA_SCALE_DEFAULT): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(50, Math.min(400, Math.round(n)));
}

export function clampTypeOverlay(n: number | undefined, fallback = TYPE_PANEL_OVERLAY_DEFAULT): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

/** CSS gradient for type-card photo shade (black at bottom → transparent at top). */
export function typePanelOverlayGradient(opacity: number | undefined): string | null {
  const a = clampTypeOverlay(opacity);
  if (a <= 0.005) return null;
  const mid = Math.round(a * 36) / 100;
  return `linear-gradient(to top, rgba(0,0,0,${a}) 0%, rgba(0,0,0,${mid}) 42%, transparent 100%)`;
}

/** Label wrap box as % of the card. Can exceed 100 so a long name stays on one wrap-line. */
export function clampTypeLabelMaxW(n: number | undefined, fallback = TYPE_PANEL_LABEL_MAX_W_DEFAULT): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(40, Math.min(220, Math.round(n)));
}

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
  /** Card opacity 0–1. Default 1. */
  opacity?: number;
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
  opacity?: number;
  /** When true, item is not shown for this mode (still editable in Design Mode) */
  hidden?: boolean;
};

export type RailSectionLayout = {
  x: number;
  y: number;
  gap: number;
  title: string;
  items: RailItem[];
  /** Section opacity 0–1. Default 1. */
  opacity?: number;
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

/** Round to `decimals` places (default 1 for smooth % drag: tenths). */
export function roundToDecimals(n: number, decimals = 1): number {
  if (!Number.isFinite(n)) return n;
  if (decimals <= 0) return Math.round(n);
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function clampRailPercent(n: number | undefined, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  // Tenths of a percent — whole integers make header/rail labels jump too coarsely
  return Math.max(0, Math.min(100, roundToDecimals(n, 1)));
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
  if (ov.labelX !== undefined) next.labelX = ov.labelX;
  if (ov.labelY !== undefined) next.labelY = ov.labelY;
  if (ov.countX !== undefined) next.countX = ov.countX;
  if (ov.countY !== undefined) next.countY = ov.countY;
  if (ov.iconX !== undefined) next.iconX = ov.iconX;
  if (ov.iconY !== undefined) next.iconY = ov.iconY;
  if (ov.mediaScale !== undefined) next.mediaScale = ov.mediaScale;
  if (ov.mediaX !== undefined) next.mediaX = ov.mediaX;
  if (ov.mediaY !== undefined) next.mediaY = ov.mediaY;
  if (ov.labelWrap !== undefined) next.labelWrap = ov.labelWrap === true;
  if (ov.labelMaxW !== undefined) next.labelMaxW = ov.labelMaxW;
  if (ov.labelHidden !== undefined) next.labelHidden = ov.labelHidden === true;
  if (ov.countHidden !== undefined) next.countHidden = ov.countHidden === true;
  if (ov.overlayOpacity !== undefined) next.overlayOpacity = ov.overlayOpacity;
  if (ov.opacity !== undefined) next.opacity = ov.opacity;
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
  if (ov.opacity !== undefined) next.opacity = ov.opacity;
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

/** Skip the extra type-count aggregation when no card shows a listing count. */
export function typePanelNeedsCountQuery(items: TypePanelItem[] | undefined | null): boolean {
  if (!items?.length) return true;
  return items.some((it) => it.countHidden !== true);
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
    labelX: item.labelX,
    labelY: item.labelY,
    countX: item.countX,
    countY: item.countY,
    iconX: item.iconX,
    iconY: item.iconY,
    mediaScale: item.mediaScale,
    mediaX: item.mediaX,
    mediaY: item.mediaY,
    labelWrap: item.labelWrap === true,
    labelMaxW: item.labelMaxW,
    labelHidden: item.labelHidden === true,
    countHidden: item.countHidden === true,
    overlayOpacity: clampTypeOverlay(item.overlayOpacity),
    opacity: clampOpacity(item.opacity),
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
    opacity: clampOpacity(item.opacity),
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
  const hidePatch: Partial<TypePanelItem> = {
    ...(patch.labelHidden !== undefined ? { labelHidden: patch.labelHidden === true } : {}),
    ...(patch.countHidden !== undefined ? { countHidden: patch.countHidden === true } : {}),
  };
  return {
    ...item,
    ...hidePatch,
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
  if (typeof raw.labelX === 'number') out.labelX = clampRailPercent(raw.labelX, TYPE_PANEL_LABEL_POS_DEFAULT.x);
  if (typeof raw.labelY === 'number') out.labelY = clampRailPercent(raw.labelY, TYPE_PANEL_LABEL_POS_DEFAULT.y);
  if (typeof raw.countX === 'number') out.countX = clampRailPercent(raw.countX, TYPE_PANEL_COUNT_POS_DEFAULT.x);
  if (typeof raw.countY === 'number') out.countY = clampRailPercent(raw.countY, TYPE_PANEL_COUNT_POS_DEFAULT.y);
  if (typeof raw.iconX === 'number') out.iconX = clampRailPercent(raw.iconX, TYPE_PANEL_ICON_POS_DEFAULT.x);
  if (typeof raw.iconY === 'number') out.iconY = clampRailPercent(raw.iconY, TYPE_PANEL_ICON_POS_DEFAULT.y);
  if (typeof raw.mediaScale === 'number') out.mediaScale = clampMediaScale(raw.mediaScale);
  if (typeof raw.mediaX === 'number') out.mediaX = clampRailPercent(raw.mediaX, TYPE_PANEL_MEDIA_POS_DEFAULT.x);
  if (typeof raw.mediaY === 'number') out.mediaY = clampRailPercent(raw.mediaY, TYPE_PANEL_MEDIA_POS_DEFAULT.y);
  if (typeof raw.labelWrap === 'boolean') out.labelWrap = raw.labelWrap;
  if (typeof raw.labelMaxW === 'number') out.labelMaxW = clampTypeLabelMaxW(raw.labelMaxW);
  if (typeof raw.labelHidden === 'boolean') out.labelHidden = raw.labelHidden;
  if (typeof raw.countHidden === 'boolean') out.countHidden = raw.countHidden;
  if (typeof raw.overlayOpacity === 'number') out.overlayOpacity = clampTypeOverlay(raw.overlayOpacity);
  if (typeof raw.opacity === 'number') out.opacity = clampOpacity(raw.opacity);
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
  if (typeof raw.opacity === 'number') out.opacity = clampOpacity(raw.opacity);
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
  /** Phone hero photo height in CSS px (independent of desktop `h`) */
  mobileH?: number;
  /** Phone gap between deal bar / search under the photo (px) */
  mobileStackGap?: number;
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
  /** Slideshow / photo layer opacity 0–1. Does not fade search or deal bar. */
  opacity?: number;
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
  /** Phone-only offset of the title block */
  mobileX?: number;
  mobileY?: number;
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
  /** Item opacity 0–1. Default 1. */
  opacity?: number;
  /** Extra exclusion padding around this item (px). Added to header itemGapPx. */
  padPx?: number;
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

/**
 * Pixel widths of Georgian xl labels — used to pack equal-gap default positions.
 * Centers are stored as % so the same rhythm scales with the bar.
 */
export const HEADER_ITEM_WIDTH_PX: Record<HeaderItemId, number> = {
  brand: 52,
  services: 114,
  about: 56,
  agents: 85,
  upload: 171,
  favorites: 111,
  compare: 89,
  login: 70,
  messages: 110,
  profile: 75,
  admin: 126,
  theme: 36,
  language: 56,
};

export const HEADER_LEFT_CLUSTER_IDS: HeaderItemId[] = [
  'brand',
  'services',
  'about',
  'agents',
  'upload',
];

export const HEADER_RIGHT_CLUSTER_IDS: HeaderItemId[] = [
  'favorites',
  'compare',
  'login',
  'messages',
  'profile',
  'admin',
  'theme',
  'language',
];

/** Single row order: logo → nav → utilities */
export const HEADER_ROW_IDS: HeaderItemId[] = [
  ...HEADER_LEFT_CLUSTER_IDS,
  ...HEADER_RIGHT_CLUSTER_IDS,
];

/** Matches `max-w-6xl` + `px-4` classic header so items aren’t glued to the viewport. */
export const HEADER_CONTENT_MAX_PX = 1152;
export const HEADER_CONTENT_INSET_PX = 16;
export const HEADER_PACK_GAP_MIN_PX = 12;
export const HEADER_PACK_GAP_MAX_PX = 24;
export const HEADER_PACK_REF_WIDTH = 1920;

function headerContentBand(barW: number): { left: number; width: number } {
  const col = Math.min(HEADER_CONTENT_MAX_PX, barW);
  const side = Math.max(0, (barW - col) / 2);
  const left = side + HEADER_CONTENT_INSET_PX;
  const right = barW - side - HEADER_CONTENT_INSET_PX;
  return { left, width: Math.max(1, right - left) };
}

function packHeaderRow(
  skip: Set<HeaderItemId>,
  barW: number,
  widthsPx: Partial<Record<HeaderItemId, number>> | undefined
): Partial<Record<HeaderItemId, HeaderItemPos>> {
  const widthOf = (id: HeaderItemId) => widthsPx?.[id] ?? HEADER_ITEM_WIDTH_PX[id];
  const ids = HEADER_ROW_IDS.filter((id) => !skip.has(id));
  const { left, width: innerW } = headerContentBand(barW);
  const totalW = ids.reduce((sum, id) => sum + widthOf(id), 0);
  const gapCount = Math.max(0, ids.length - 1);
  const rawGap = gapCount > 0 ? (innerW - totalW) / gapCount : 0;
  const gapPx = Math.max(HEADER_PACK_GAP_MIN_PX, Math.min(HEADER_PACK_GAP_MAX_PX, rawGap));
  const used = totalW + gapPx * gapCount;
  let cursor = left + Math.max(0, (innerW - used) / 2);
  const out: Partial<Record<HeaderItemId, HeaderItemPos>> = {};
  for (const id of ids) {
    const w = widthOf(id);
    const center = cursor + w / 2;
    out[id] = { x: clampRailPercent((center / barW) * 100, 50), y: 50 };
    cursor += w + gapPx;
  }
  return out;
}

/** One even row inside the content column — same gap between every label. */
export function packHeaderItemPositions(opts?: {
  barW?: number;
  widthsPx?: Partial<Record<HeaderItemId, number>>;
  gapPx?: number;
  padPx?: number;
  skipIds?: Iterable<HeaderItemId>;
}): Record<HeaderItemId, HeaderItemPos> {
  const barW = Math.max(640, opts?.barW ?? HEADER_PACK_REF_WIDTH);
  const skip = new Set(opts?.skipIds ?? ['messages', 'login']);
  const visible = packHeaderRow(skip, barW, opts?.widthsPx);
  const typical = packHeaderRow(new Set<HeaderItemId>(['messages', 'login']), barW, opts?.widthsPx);
  const out = {} as Record<HeaderItemId, HeaderItemPos>;
  for (const id of HEADER_ITEM_IDS) {
    out[id] = visible[id] || typical[id] || { x: 50, y: 50 };
  }
  if (typical.profile) {
    if (!visible.login) out.login = { ...typical.profile };
    if (!visible.messages && typical.compare && typical.profile) {
      out.messages = {
        x: clampRailPercent((typical.compare.x + typical.profile.x) / 2, 50),
        y: 50,
      };
    }
  }
  return out;
}

export function headerItemIdsHiddenByStyle(
  styles: Partial<Record<HeaderItemId, HeaderItemStyle>> | undefined
): HeaderItemId[] {
  if (!styles) return [];
  return HEADER_ITEM_IDS.filter((id) => (styles[id]?.opacity ?? 1) <= 0.02);
}

/**
 * Default free-layout spots: one even row in the max-w-6xl column.
 */
export const DEFAULT_HEADER_ITEM_POSITIONS: Record<HeaderItemId, HeaderItemPos> =
  packHeaderItemPositions();

/** Old even-spread across the whole bar (looked sparse / uneven). */
const LEGACY_EVEN_HEADER_X: Partial<Record<HeaderItemId, number>> = {
  brand: 5,
  services: 15,
  about: 24,
  agents: 33,
  upload: 44,
  favorites: 55,
  compare: 64,
  login: 72,
  messages: 78,
  profile: 84,
  admin: 90,
  theme: 95,
  language: 98.5,
};

function headerXNear(value: number | undefined, target: number, tol = 0.8): boolean {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value - target) <= tol;
}

function isLegacyEvenHeaderSpread(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>>
): boolean {
  return (
    headerXNear(positions.brand?.x, LEGACY_EVEN_HEADER_X.brand!) &&
    headerXNear(positions.services?.x, LEGACY_EVEN_HEADER_X.services!) &&
    headerXNear(positions.about?.x, LEGACY_EVEN_HEADER_X.about!) &&
    headerXNear(positions.agents?.x, LEGACY_EVEN_HEADER_X.agents!) &&
    headerXNear(positions.upload?.x, LEGACY_EVEN_HEADER_X.upload!)
  );
}

export function copyDefaultHeaderItemPositions(): Record<HeaderItemId, HeaderItemPos> {
  const out = {} as Record<HeaderItemId, HeaderItemPos>;
  for (const id of HEADER_ITEM_IDS) {
    out[id] = { ...DEFAULT_HEADER_ITEM_POSITIONS[id] };
  }
  return out;
}

export type HeaderLayout = {
  /** Bar height in px */
  h: number;
  /** Whole header bar opacity 0–1. Default 1. */
  opacity?: number;
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
  /**
   * Minimum gap between header label edges (px).
   * Drag/inspector keep items from sitting closer than this.
   */
  itemGapPx?: number;
};

export type HomeDesignLayout = {
  version: 3;
  header: HeaderLayout;
  hero: HeroLayout;
  heroText: HeroTextLayout;
  /** Dynamic theme modes (source of truth for palettes + hero galleries) */
  themeModes: ThemeModeDef[];
  /** @deprecated synced from themeModes for older readers */
  themePalettes: ThemePalettes;
  search: SearchLayout;
  /** Deal type chips (იყიდება / ქირავდება / გირავდება) */
  dealBar: DealBarLayout;
  /** Property type chips (ბინა, სახლი, აგარაკი…) */
  typePanel: TypePanelLayout;
  serviceRail: RailSectionLayout & {
    /** each circle width */
    itemW: number;
    /** each circle height */
    itemH: number;
  };
  map: BoxLayout;
  /** Property results: found count, sort, cards, pagination */
  listings: BoxLayout;
  quickRail: RailSectionLayout & {
    w: number;
    /** each card min-height */
    itemH: number;
  };
  /** საიტის სოციალური პროფილები — ობიექტის გვერდზე ჩათის ბმულები */
  socialLinks: SiteSocialLinks;
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

export const HERO_MOBILE_H_DEFAULT = 220;
export const HERO_MOBILE_H_MIN = 80;
export const HERO_MOBILE_H_MAX = 520;
export const HERO_H_MIN = 80;
export const HERO_H_MAX = 900;
export const HERO_MOBILE_STACK_GAP_DEFAULT = 4;
export const HERO_MOBILE_STACK_GAP_MIN = 0;
export const HERO_MOBILE_STACK_GAP_MAX = 32;

export const DEFAULT_HERO: HeroLayout = {
  h: 360,
  mobileH: HERO_MOBILE_H_DEFAULT,
  mobileStackGap: HERO_MOBILE_STACK_GAP_DEFAULT,
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
  mobileX: 16,
  mobileY: 16,
};

export const DEFAULT_HEADER: HeaderLayout = {
  h: 60,
  itemGapPx: 8,
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
  itemPositions: packHeaderItemPositions(),
};

export const DEFAULT_SEARCH_CONTROLS: Record<SearchControlId, SearchControlLayout> = {
  price: { w: 152, h: 48 },
  area: { w: 152, h: 48 },
  city: { w: 152, h: 48 },
  rooms: { w: 152, h: 48 },
  query: { w: 280, h: 48 },
  advanced: { w: 180, h: 48 },
  submit: { w: 128, h: 48 },
};

export const DEFAULT_DEAL_CHIPS: Record<DealChipId, DealChipLayout> = {
  sale: { w: 140, h: 40 },
  rent: { w: 140, h: 40 },
  mortgage: { w: 140, h: 40 },
};

export function buildDefaultSearchControls(
  from?: Partial<SearchLayout> | null
): Record<SearchControlId, SearchControlLayout> {
  const tw = clampPx(from?.triggerWidth, DEFAULT_SEARCH_CONTROLS.price.w, 72, 280);
  const th = clampPx(from?.triggerMinHeight, DEFAULT_SEARCH_CONTROLS.price.h, 32, 96);
  const ih = clampPx(from?.inputHeight, DEFAULT_SEARCH_CONTROLS.query.h, 32, 96);
  const bh = clampPx(from?.buttonHeight, DEFAULT_SEARCH_CONTROLS.advanced.h, 32, 96);
  const qw = clampPx(from?.controls?.query?.w, DEFAULT_SEARCH_CONTROLS.query.w, 120, 560);
  const aw = clampPx(from?.controls?.advanced?.w, DEFAULT_SEARCH_CONTROLS.advanced.w, 96, 420);
  const sw = clampPx(from?.controls?.submit?.w, DEFAULT_SEARCH_CONTROLS.submit.w, 72, 280);
  return {
    price: { w: tw, h: th },
    area: { w: tw, h: th },
    city: { w: tw, h: th },
    rooms: { w: tw, h: th },
    query: { w: qw, h: ih },
    advanced: { w: aw, h: bh },
    submit: { w: sw, h: bh },
  };
}

export function normalizeSearchControl(
  raw: Partial<SearchControlLayout> | null | undefined,
  fallback: SearchControlLayout
): SearchControlLayout {
  return {
    w: clampPx(raw?.w, fallback.w, 56, 560),
    h: clampPx(raw?.h, fallback.h, 28, 120),
    opacity: clampOpacity(raw?.opacity, fallback.opacity ?? OPACITY_DEFAULT),
  };
}

export function normalizeSearchControls(
  raw: Partial<Record<SearchControlId, Partial<SearchControlLayout>>> | null | undefined,
  legacy?: Partial<SearchLayout> | null
): Record<SearchControlId, SearchControlLayout> {
  const defaults = buildDefaultSearchControls(legacy);
  const out = { ...defaults };
  for (const id of SEARCH_CONTROL_IDS) {
    out[id] = normalizeSearchControl(raw?.[id], defaults[id]);
  }
  return out;
}

export function resolveSearchControl(
  search: SearchLayout | null | undefined,
  id: SearchControlId
): SearchControlLayout {
  if (search?.controls?.[id]) return normalizeSearchControl(search.controls[id], DEFAULT_SEARCH_CONTROLS[id]);
  return buildDefaultSearchControls(search)[id];
}

export function normalizeDealChip(
  raw: Partial<DealChipLayout> | null | undefined,
  fallback: DealChipLayout
): DealChipLayout {
  return {
    w: clampPx(raw?.w, fallback.w, 72, 320),
    h: clampPx(raw?.h, fallback.h, 28, 72),
    opacity: clampOpacity(raw?.opacity, fallback.opacity ?? OPACITY_DEFAULT),
  };
}

export function normalizeDealChips(
  raw: Partial<Record<DealChipId, Partial<DealChipLayout>>> | null | undefined
): Record<DealChipId, DealChipLayout> {
  const out = { ...DEFAULT_DEAL_CHIPS };
  for (const id of DEAL_CHIP_IDS) {
    out[id] = normalizeDealChip(raw?.[id], DEFAULT_DEAL_CHIPS[id]);
  }
  return out;
}

export const DEFAULT_DEAL_BAR: DealBarLayout = {
  x: 0,
  y: 0,
  w: 480,
  h: 48,
  mobileX: 0,
  mobileY: 0,
  gap: 8,
  chips: { ...DEFAULT_DEAL_CHIPS },
};

export function normalizeDealBar(
  raw?: Partial<DealBarLayout> | null
): DealBarLayout {
  const base = normalizeBoxLayout(raw, DEFAULT_DEAL_BAR, {
    maxH: 72,
    stackMobile: true,
  });
  return {
    ...base,
    gap: clampPx(raw?.gap, DEFAULT_DEAL_BAR.gap, 0, 32),
    chips: normalizeDealChips(raw?.chips),
  };
}

export const DEFAULT_SEARCH: SearchLayout = {
  x: 0,
  y: 0,
  w: 1280,
  h: 88,
  mobileX: 0,
  mobileY: 0,
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
  controls: { ...DEFAULT_SEARCH_CONTROLS },
};

export const DEFAULT_HOME_DESIGN: HomeDesignLayout = {
  version: 3,
  header: { ...DEFAULT_HEADER, itemPositions: copyDefaultHeaderItemPositions() },
  hero: { ...DEFAULT_HERO },
  heroText: { ...DEFAULT_HERO_TEXT },
  themeModes: createDefaultThemeModes(),
  themePalettes: {
    day: { ...DEFAULT_THEME_PALETTES.day },
    twilight: { ...DEFAULT_THEME_PALETTES.twilight },
    night: { ...DEFAULT_THEME_PALETTES.night },
  },
  search: { ...DEFAULT_SEARCH, controls: { ...DEFAULT_SEARCH_CONTROLS } },
  dealBar: { ...DEFAULT_DEAL_BAR, chips: { ...DEFAULT_DEAL_CHIPS } },
  typePanel: {
    x: 0,
    y: 0,
    w: 1280,
    h: 164,
    pad: 10,
    gap: 12,
    mobileX: 0,
    mobileY: 0,
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
  /** h = min-height; რეალური სიმაღლე იზრდება ბარათების რაოდენობით */
  listings: { x: 0, y: 0, w: 1280, h: 480 },
  quickRail: {
    x: 0,
    y: 0,
    w: 200,
    itemH: 88,
    gap: 12,
    title: 'სწრაფი ბმულები',
    items: DEFAULT_QUICK_ITEMS,
  },
  socialLinks: { ...EMPTY_SITE_SOCIAL_LINKS },
};

function boxGeometryFrom(def: BoxLayout): Pick<BoxLayout, 'x' | 'y' | 'w' | 'h' | 'mobileX' | 'mobileY'> {
  return {
    x: def.x,
    y: def.y,
    w: def.w,
    h: def.h,
    mobileX: def.mobileX,
    mobileY: def.mobileY,
  };
}

/**
 * Reset x/y/w/h (and header item spots) to code defaults.
 * Keeps theme modes, colors, labels, opacities, and hidden flags.
 */
export function applyDefaultGeometry(current: HomeDesignLayout): HomeDesignLayout {
  const d = DEFAULT_HOME_DESIGN;
  const searchControls = { ...d.search.controls };
  for (const id of SEARCH_CONTROL_IDS) {
    const prev = current.search.controls?.[id];
    searchControls[id] = {
      w: d.search.controls[id].w,
      h: d.search.controls[id].h,
      ...(typeof prev?.opacity === 'number' ? { opacity: prev.opacity } : {}),
    };
  }
  const dealChips = { ...d.dealBar.chips };
  for (const id of DEAL_CHIP_IDS) {
    const prev = current.dealBar.chips?.[id];
    dealChips[id] = {
      w: d.dealBar.chips[id].w,
      h: d.dealBar.chips[id].h,
      ...(typeof prev?.opacity === 'number' ? { opacity: prev.opacity } : {}),
    };
  }
  return {
    ...current,
    header: {
      ...current.header,
      h: d.header.h,
      itemGapPx: d.header.itemGapPx,
      itemPositions: copyDefaultHeaderItemPositions(),
    },
    hero: {
      ...current.hero,
      h: d.hero.h,
      mobileH: d.hero.mobileH,
      mobileStackGap: d.hero.mobileStackGap,
    },
    heroText: {
      ...current.heroText,
      ...boxGeometryFrom(d.heroText),
    },
    search: {
      ...current.search,
      ...boxGeometryFrom(d.search),
      controls: searchControls,
    },
    dealBar: {
      ...current.dealBar,
      ...boxGeometryFrom(d.dealBar),
      gap: d.dealBar.gap,
      chips: dealChips,
    },
    typePanel: {
      ...current.typePanel,
      ...boxGeometryFrom(d.typePanel),
      pad: d.typePanel.pad,
      gap: d.typePanel.gap,
    },
    serviceRail: {
      ...current.serviceRail,
      x: d.serviceRail.x,
      y: d.serviceRail.y,
      gap: d.serviceRail.gap,
      itemW: d.serviceRail.itemW,
      itemH: d.serviceRail.itemH,
    },
    map: { ...current.map, ...boxGeometryFrom(d.map) },
    listings: { ...current.listings, ...boxGeometryFrom(d.listings) },
    quickRail: {
      ...current.quickRail,
      x: d.quickRail.x,
      y: d.quickRail.y,
      w: d.quickRail.w,
      gap: d.quickRail.gap,
      itemH: d.quickRail.itemH,
    },
  };
}

export type DesignableId =
  | 'header'
  | 'hero'
  | 'heroText'
  | 'dealBar'
  | 'search'
  | 'typePanel'
  | 'serviceRail'
  | 'map'
  | 'listings'
  | 'quickRail'
  | 'theme'
  | 'social';

export const DESIGNABLE_LABELS: Record<DesignableId, string> = {
  header: 'ჰედერი',
  hero: 'ჰერო ფონი',
  heroText: 'ჰერო ტექსტი',
  dealBar: 'გარიგების ტიპები',
  search: 'სერჩი',
  typePanel: 'ქონების ტიპები',
  serviceRail: 'სერვისის წრეები',
  map: 'რუკა',
  listings: 'ობიექტების სია',
  quickRail: 'სწრაფი ბმულები',
  theme: 'რეჟიმები და ფერები',
  social: 'სოციალური ქსელები',
};

export const DESIGNABLE_HINTS: Record<DesignableId, string> = {
  header: 'ჰედერის სიმაღლე და ფონი; ლოგო/მენიუ — ცალკე ქვეფოლდერებში.',
  hero: 'ჰეროს სიმაღლე და სლაიდშოუ. თითოეულ რეჟიმს (დღე/შუალედური/ღამე) თავისი ფოტოები აქვს — არ ირევა.',
  heroText: 'მთავარი სათაური / ქვესათაური — ტექსტი, ზომა და ფერი.',
  dealBar: 'იყიდება / ქირავდება / გირავდება — პოზიცია და ზომა.',
  search: 'ძიების ბლოკი — ჩარჩო, ფილტრები, სერჩი და გაფართოებული ღილაკი.',
  typePanel: 'ქონების ტიპები — ფოტო გადაათრიე/გაადიდე, წარწერები გადაადგილე; ფერი/ფოტო რეჟიმის მიხედვით.',
  serviceRail:
    'მარცხენა წრეები — ფორმა/სურათი/ტექსტი; ჩვენება/დამალვა რეჟიმის მიხედვით.',
  map: 'მთავარი გვერდის რუკის ზომა და პოზიცია.',
  listings:
    'ობიექტების ჩამონათვალი — ნაპოვნია/სორტი/ბარათები/პაგინაცია; გადაადგილება და სიგანე.',
  quickRail:
    'მარჯვენა სწრაფი ბმულები — ფორმა/სურათი/ტექსტი; ჩვენება/დამალვა რეჟიმის მიხედვით.',
  theme: 'რეჟიმები, ფერები და გადასართავი იკონი (emoji / მედია). ჰედერზე იკონზე კლიკი აქ გახსნის.',
  social:
    'საიტის Facebook, Instagram, X, WhatsApp, Telegram, YouTube, TikTok, LinkedIn ბმულები. ობიექტის გვერდზე იკონი ჩათს ან პროფილს ხსნის, არა გაზიარებას.',
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
    opacity: clampOpacity(partial?.opacity),
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
    opacity: clampOpacity(it?.opacity),
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
    h: Math.max(HERO_H_MIN, Math.min(HERO_H_MAX, Math.round(raw?.h ?? DEFAULT_HERO.h))),
    mobileH: Math.max(
      HERO_MOBILE_H_MIN,
      Math.min(
        HERO_MOBILE_H_MAX,
        Math.round(raw?.mobileH ?? DEFAULT_HERO.mobileH ?? HERO_MOBILE_H_DEFAULT)
      )
    ),
    mobileStackGap: Math.max(
      HERO_MOBILE_STACK_GAP_MIN,
      Math.min(
        HERO_MOBILE_STACK_GAP_MAX,
        Math.round(
          raw?.mobileStackGap ?? DEFAULT_HERO.mobileStackGap ?? HERO_MOBILE_STACK_GAP_DEFAULT
        )
      )
    ),
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
    opacity: clampOpacity(raw?.opacity),
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
    mobileX: Math.max(
      0,
      Math.min(360, Math.round(raw?.mobileX ?? DEFAULT_HERO_TEXT.mobileX ?? 16))
    ),
    mobileY: Math.max(
      0,
      Math.min(520, Math.round(raw?.mobileY ?? DEFAULT_HERO_TEXT.mobileY ?? 16))
    ),
    opacity: clampOpacity(raw?.opacity, DEFAULT_HERO_TEXT.opacity),
  };
}

export function normalizeSearch(raw?: Partial<SearchLayout> | null): SearchLayout {
  const d = DEFAULT_SEARCH;
  const SEARCH_H_MAX = 120;
  let h = Math.max(56, Math.min(SEARCH_H_MAX, Math.round(raw?.h ?? d.h)));
  // ძველი ერთხაზიანი (70) ან ორხაზიანი სერჩი გარიგებით (128) → ახალი სერჩი
  // ასევე მობილური resize-ით გაბერილი desktop h (მაგ. 200+) → default
  if (!raw?.h || raw.h === 70 || raw.h === 128 || raw.h > 140) {
    h = d.h;
  }
  return {
    x: Math.round(raw?.x ?? d.x),
    y: Math.round(raw?.y ?? d.y),
    w: Math.max(320, Math.min(1600, Math.round(raw?.w ?? d.w))),
    h,
    mobileX: clampStackMobileNudgeX(raw?.mobileX, d.mobileX ?? 0),
    mobileY: clampStackMobileNudgeY(raw?.mobileY, d.mobileY ?? 0),
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
    controls: normalizeSearchControls(raw?.controls, raw ?? d),
    opacity: clampOpacity(raw?.opacity, d.opacity),
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
    labelX: clampRailPercent(it?.labelX, fallback.labelX ?? TYPE_PANEL_LABEL_POS_DEFAULT.x),
    labelY: clampRailPercent(it?.labelY, fallback.labelY ?? TYPE_PANEL_LABEL_POS_DEFAULT.y),
    countX: clampRailPercent(it?.countX, fallback.countX ?? TYPE_PANEL_COUNT_POS_DEFAULT.x),
    countY: clampRailPercent(it?.countY, fallback.countY ?? TYPE_PANEL_COUNT_POS_DEFAULT.y),
    iconX: clampRailPercent(it?.iconX, fallback.iconX ?? TYPE_PANEL_ICON_POS_DEFAULT.x),
    iconY: clampRailPercent(it?.iconY, fallback.iconY ?? TYPE_PANEL_ICON_POS_DEFAULT.y),
    mediaScale: clampMediaScale(it?.mediaScale, fallback.mediaScale ?? TYPE_PANEL_MEDIA_SCALE_DEFAULT),
    mediaX: clampRailPercent(it?.mediaX, fallback.mediaX ?? TYPE_PANEL_MEDIA_POS_DEFAULT.x),
    mediaY: clampRailPercent(it?.mediaY, fallback.mediaY ?? TYPE_PANEL_MEDIA_POS_DEFAULT.y),
    labelWrap: it?.labelWrap === true || fallback.labelWrap === true,
    labelMaxW: clampTypeLabelMaxW(it?.labelMaxW, fallback.labelMaxW ?? TYPE_PANEL_LABEL_MAX_W_DEFAULT),
    labelHidden: it?.labelHidden === true || fallback.labelHidden === true,
    countHidden: it?.countHidden === true || fallback.countHidden === true,
    overlayOpacity: clampTypeOverlay(
      it?.overlayOpacity,
      fallback.overlayOpacity ?? TYPE_PANEL_OVERLAY_DEFAULT
    ),
    opacity: clampOpacity(it?.opacity, fallback.opacity),
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
    mobileX: clampStackMobileNudgeX(raw?.mobileX, d.mobileX ?? 0),
    mobileY: clampStackMobileNudgeY(raw?.mobileY, d.mobileY ?? 0),
    pad: Math.max(0, Math.min(48, Math.round(raw?.pad ?? d.pad))),
    gap: Math.max(0, Math.min(40, Math.round(raw?.gap ?? d.gap))),
    opacity: clampOpacity(raw?.opacity, d.opacity),
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
    opacity: clampOpacity(raw?.opacity, DEFAULT_HEADER.opacity),
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
    itemGapPx: clampHeaderItemGapPx(raw?.itemGapPx, DEFAULT_HEADER.itemGapPx),
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

  if (isLegacyEvenHeaderSpread(out)) {
    return copyDefaultHeaderItemPositions();
  }

  return out;
}

/** True when free-layout X positions collide / cluster too tightly for a readable nav. */
export function headerFreeLayoutIsCramped(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined
): boolean {
  if (!positions) return false;
  const hasProfile = Boolean(positions.profile);
  const xs = HEADER_ITEM_IDS.map((id) => {
    if (id === 'messages') return undefined;
    if (id === 'login' && hasProfile) return undefined;
    return positions[id]?.x;
  })
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
    .sort((a, b) => a - b);
  if (xs.length < 5) return false;

  let exactDupes = 0;
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i]! - xs[i - 1]!;
    if (gap < 0.75) exactDupes += 1;
  }
  const span = xs[xs.length - 1]! - xs[0]!;
  // Exact stacked labels, or everything piled in a narrow band.
  // Tight equal-gap clusters are intentional — not cramped.
  return exactDupes >= 1 || span < 40;
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
    if (typeof style.opacity === 'number' && Number.isFinite(style.opacity)) {
      next.opacity = clampOpacity(style.opacity);
    }
    if (typeof style.padPx === 'number' && Number.isFinite(style.padPx) && style.padPx > 0) {
      next.padPx = clampHeaderItemGapPx(style.padPx, 0);
    }
    if (
      next.fontSize !== undefined ||
      next.color ||
      next.opacity !== undefined ||
      next.padPx !== undefined
    ) {
      out[id] = next;
    }
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

/** Fallback AABB size (% of header bar) when DOM measurement is unavailable. */
export const DEFAULT_HEADER_ITEM_SIZE_PCT: Record<HeaderItemId, { wPct: number; hPct: number }> = {
  brand: { wPct: 5.2, hPct: 40 },
  services: { wPct: 9.0, hPct: 40 },
  about: { wPct: 4.5, hPct: 40 },
  agents: { wPct: 6.7, hPct: 40 },
  upload: { wPct: 13.5, hPct: 40 },
  favorites: { wPct: 8.8, hPct: 40 },
  compare: { wPct: 7.0, hPct: 40 },
  login: { wPct: 5.5, hPct: 40 },
  messages: { wPct: 9.0, hPct: 40 },
  profile: { wPct: 6.0, hPct: 40 },
  admin: { wPct: 10.0, hPct: 44 },
  theme: { wPct: 2.9, hPct: 44 },
  language: { wPct: 4.4, hPct: 44 },
};

export type HeaderItemSizePct = { wPct: number; hPct: number };

export const HEADER_ITEM_GAP_PX_DEFAULT = 8;
export const HEADER_ITEM_GAP_PX_MIN = 0;
export const HEADER_ITEM_GAP_PX_MAX = 72;

export function clampHeaderItemGapPx(
  n: number | undefined,
  fallback = HEADER_ITEM_GAP_PX_DEFAULT
): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(HEADER_ITEM_GAP_PX_MIN, Math.min(HEADER_ITEM_GAP_PX_MAX, Math.round(n)));
}

export function headerItemPadPxById(
  styles: Partial<Record<HeaderItemId, HeaderItemStyle>> | undefined
): Partial<Record<HeaderItemId, number>> {
  const out: Partial<Record<HeaderItemId, number>> = {};
  if (!styles) return out;
  for (const id of HEADER_ITEM_IDS) {
    const pad = styles[id]?.padPx;
    if (typeof pad === 'number' && pad > 0) out[id] = clampHeaderItemGapPx(pad, 0);
  }
  return out;
}

export type HeaderOverlapOpts = {
  sizes?: Partial<Record<HeaderItemId, HeaderItemSizePct>>;
  /** When set, only these items participate in collision (skip hidden login/messages/…). */
  visibleIds?: readonly HeaderItemId[];
  gapPx?: number;
  padPxById?: Partial<Record<HeaderItemId, number>>;
  barW?: number;
  barH?: number;
  axisLock?: 'x' | 'y' | null;
};

/**
 * Keep free-layout header centers from stacking (AABB + edge gap).
 * Positions are centers (`translate(-50%, -50%)`).
 * Push direction follows the desired (pointer) side so items don’t flicker
 * around a neighbor while dragging.
 * `axisLock: 'x'` = horizontal only (Shift); `'y'` = vertical only (Alt).
 */
export function resolveHeaderItemNoOverlap(
  itemId: HeaderItemId,
  proposed: HeaderItemPos,
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  opts?: HeaderOverlapOpts
): HeaderItemPos {
  const desiredX = clampRailPercent(proposed.x, proposed.x);
  const desiredY = clampRailPercent(proposed.y, proposed.y);
  let x = desiredX;
  let y = desiredY;
  const axisLock = opts?.axisLock ?? null;
  const barW = Math.max(1, opts?.barW ?? 1280);
  const barH = Math.max(1, opts?.barH ?? 60);
  const baseGapPx = clampHeaderItemGapPx(opts?.gapPx);

  const visible: HeaderItemId[] = opts?.visibleIds
    ? [...opts.visibleIds]
    : opts?.sizes
      ? HEADER_ITEM_IDS.filter((id) => Boolean(opts.sizes?.[id]))
      : // Never collide with `messages` (not rendered). Prefer live `visibleIds`.
        HEADER_ITEM_IDS.filter((id) => id !== 'messages' && Boolean(positions?.[id]));

  const sizeOf = (id: HeaderItemId): HeaderItemSizePct =>
    opts?.sizes?.[id] || DEFAULT_HEADER_ITEM_SIZE_PCT[id];

  const gapXY = (a: HeaderItemId, b: HeaderItemId) => {
    const extra =
      clampHeaderItemGapPx(opts?.padPxById?.[a], 0) +
      clampHeaderItemGapPx(opts?.padPxById?.[b], 0);
    const px = baseGapPx + extra;
    return { gx: (px / barW) * 100, gy: (px / barH) * 100 };
  };

  const overlaps = (
    ax: number,
    ay: number,
    other: HeaderItemPos,
    minDx: number,
    minDy: number
  ) => Math.abs(ax - other.x) < minDx && Math.abs(ay - other.y) < minDy;

  const self = sizeOf(itemId);

  for (let iter = 0; iter < 18; iter++) {
    let moved = false;
    for (const otherId of visible) {
      if (otherId === itemId) continue;
      const otherPos = positions?.[otherId];
      if (!otherPos) continue;
      const other = sizeOf(otherId);
      const { gx, gy } = gapXY(itemId, otherId);
      const minDx = (self.wPct + other.wPct) / 2 + gx;
      const minDy = (self.hPct + other.hPct) / 2 + gy;
      if (!overlaps(x, y, otherPos, minDx, minDy)) continue;

      const dirX =
        desiredX === otherPos.x
          ? otherPos.x >= 50
            ? -1
            : 1
          : Math.sign(desiredX - otherPos.x) || 1;
      const dirY =
        desiredY === otherPos.y
          ? otherPos.y >= 50
            ? -1
            : 1
          : Math.sign(desiredY - otherPos.y) || 1;

      const candX: HeaderItemPos = {
        x: clampRailPercent(otherPos.x + dirX * minDx, x),
        y,
      };
      const candY: HeaderItemPos = {
        x,
        y: clampRailPercent(otherPos.y + dirY * minDy, y),
      };

      const distPx = (cand: HeaderItemPos) => {
        const dx = ((cand.x - desiredX) / 100) * barW;
        const dy = ((cand.y - desiredY) / 100) * barH;
        return dx * dx + dy * dy;
      };

      let next: HeaderItemPos;
      if (axisLock === 'x') {
        next = overlaps(candX.x, candX.y, otherPos, minDx, minDy) ? candY : candX;
      } else if (axisLock === 'y') {
        next = overlaps(candY.x, candY.y, otherPos, minDx, minDy) ? candX : candY;
      } else {
        // Pixel space — % X/% Y are not comparable on a wide, short header.
        // Prefer sliding beside a neighbor, not stacking on top of it.
        next = distPx(candX) <= distPx(candY) ? candX : candY;
      }

      if (next.x !== x || next.y !== y) {
        x = next.x;
        y = next.y;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return { x, y };
}

export function headerPositionsEqual(
  a: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  b: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined
): boolean {
  const aKeys = a ? Object.keys(a) : [];
  const bKeys = b ? Object.keys(b) : [];
  if (aKeys.length !== bKeys.length) return false;
  for (const id of HEADER_ITEM_IDS) {
    const pa = a?.[id];
    const pb = b?.[id];
    if (!pa && !pb) continue;
    if (!pa || !pb) return false;
    if (pa.x !== pb.x || pa.y !== pb.y) return false;
  }
  return true;
}

/**
 * Login and profile occupy the same header slot (only one is on screen).
 * Keep the hidden one parked on the visible account item so logging in/out
 * does not drop "შესვლა" onto leftover default coordinates.
 */
export function syncHeaderAccountSlotPositions(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  visibleIds?: readonly HeaderItemId[]
): Partial<Record<HeaderItemId, HeaderItemPos>> {
  const next: Partial<Record<HeaderItemId, HeaderItemPos>> = { ...(positions || {}) };
  const vis = visibleIds?.length ? new Set(visibleIds) : null;
  const loginVisible = vis ? vis.has('login') : Boolean(next.login);
  const profileVisible = vis ? vis.has('profile') : Boolean(next.profile);
  if (profileVisible && next.profile && !loginVisible) {
    next.login = { ...next.profile };
  } else if (loginVisible && next.login && !profileVisible) {
    next.profile = { ...next.login };
  }
  return next;
}

/**
 * Push visible header labels apart until AABB + gap is satisfied.
 * Right-hand items move first so the left of the nav stays put.
 */
export function spreadHeaderItemPositions(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  opts?: HeaderOverlapOpts
): Partial<Record<HeaderItemId, HeaderItemPos>> {
  const next: Partial<Record<HeaderItemId, HeaderItemPos>> = { ...(positions || {}) };
  const ids = (
    opts?.visibleIds?.length ? [...opts.visibleIds] : HEADER_ITEM_IDS.filter((id) => id !== 'messages')
  ).filter((id) => Boolean(next[id]));

  for (let pass = 0; pass < 14; pass++) {
    ids.sort((a, b) => next[b]!.x - next[a]!.x || next[b]!.y - next[a]!.y);
    let changed = false;
    for (const id of ids) {
      const cur = next[id]!;
      const resolved = resolveHeaderItemNoOverlap(id, cur, next, opts);
      if (resolved.x !== cur.x || resolved.y !== cur.y) {
        next[id] = resolved;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return syncHeaderAccountSlotPositions(next, ids);
}

/**
 * Keep designed left-to-right order, but push labels apart in *pixels* so they
 * still fit when the bar is narrower (other monitor, OS DPI, browser zoom).
 * `fits: false` means even a packed row overflows — caller should use flex nav.
 */
export function fitHeaderItemPositions(
  positions: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  opts?: HeaderOverlapOpts
): { positions: Partial<Record<HeaderItemId, HeaderItemPos>>; fits: boolean } {
  const next: Partial<Record<HeaderItemId, HeaderItemPos>> = { ...(positions || {}) };
  const barW = Math.max(1, opts?.barW ?? HEADER_PACK_REF_WIDTH);
  const gapPx = Math.max(HEADER_PACK_GAP_MIN_PX, clampHeaderItemGapPx(opts?.gapPx));
  const ids = (
    opts?.visibleIds?.length ? [...opts.visibleIds] : HEADER_ITEM_IDS.filter((id) => id !== 'messages')
  ).filter((id) => Boolean(next[id]));
  if (ids.length === 0) return { positions: next, fits: true };

  ids.sort((a, b) => next[a]!.x - next[b]!.x || next[a]!.y - next[b]!.y);

  const widthOf = (id: HeaderItemId) => {
    const wp = opts?.sizes?.[id]?.wPct;
    if (typeof wp === 'number' && Number.isFinite(wp) && wp > 0) return (wp / 100) * barW;
    return ((DEFAULT_HEADER_ITEM_SIZE_PCT[id]?.wPct ?? 6) / 100) * barW;
  };

  const edge = HEADER_CONTENT_INSET_PX;
  const placedLeft: number[] = [];
  let cursor = edge;
  for (const id of ids) {
    const w = widthOf(id);
    const extra =
      clampHeaderItemGapPx(opts?.padPxById?.[id], 0);
    let left = (next[id]!.x / 100) * barW - w / 2;
    if (left < cursor) left = cursor;
    placedLeft.push(left);
    cursor = left + w + gapPx + extra;
  }

  const lastId = ids[ids.length - 1]!;
  let lastRight = placedLeft[placedLeft.length - 1]! + widthOf(lastId);
  const limit = barW - edge;
  if (lastRight > limit + 0.5) {
    const shift = Math.min(lastRight - limit, Math.max(0, placedLeft[0]! - edge));
    if (shift > 0) {
      for (let i = 0; i < placedLeft.length; i++) placedLeft[i]! -= shift;
      lastRight -= shift;
    }
  }

  if (lastRight > limit + 0.5) {
    return { positions: next, fits: false };
  }

  const out: Partial<Record<HeaderItemId, HeaderItemPos>> = { ...next };
  ids.forEach((id, i) => {
    const w = widthOf(id);
    const center = placedLeft[i]! + w / 2;
    out[id] = {
      x: clampRailPercent((center / barW) * 100, next[id]!.x),
      y: next[id]!.y,
    };
  });
  return { positions: syncHeaderAccountSlotPositions(out, ids), fits: true };
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

    const layout = normalizeHomeDesignInput(parsed);
    const needsHrefPersist = (parsed.serviceRail?.items || []).some(
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

/** Normalize partial/server JSON into a full HomeDesignLayout */
export function normalizeHomeDesignInput(
  parsed: Partial<HomeDesignLayout> | null | undefined
): HomeDesignLayout {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_HOME_DESIGN;

  const serviceItems =
    parsed.serviceRail?.items?.length
      ? parsed.serviceRail.items
      : DEFAULT_HOME_DESIGN.serviceRail.items;
  const quickItems =
    parsed.quickRail?.items?.length
      ? parsed.quickRail.items
      : DEFAULT_HOME_DESIGN.quickRail.items;

  const legacyDiameter = (parsed.serviceRail as { diameter?: number } | undefined)?.diameter;
  const rawVersion = typeof parsed.version === 'number' ? parsed.version : 2;
  const hero = normalizeHero(parsed.hero);
  // v3: tighten legacy phone stack gaps (old default 6 / gap-3 era ≥10)
  if (rawVersion < 3) {
    const g = hero.mobileStackGap ?? 6;
    if (g === 6 || g >= 10) {
      hero.mobileStackGap = HERO_MOBILE_STACK_GAP_DEFAULT;
    }
  }

  return syncLegacyThemeFields({
    ...DEFAULT_HOME_DESIGN,
    ...parsed,
    version: 3,
    header: normalizeHeader(parsed.header),
    hero,
    heroText: normalizeHeroText(parsed.heroText),
    themeModes: normalizeThemeModes(
      (parsed as { themeModes?: unknown }).themeModes,
      parsed.hero,
      parsed.themePalettes
    ),
    themePalettes: normalizeThemePalettes(parsed.themePalettes),
    search: normalizeSearch(parsed.search),
    dealBar: normalizeDealBar(parsed.dealBar as Partial<DealBarLayout> | null | undefined),
    typePanel: normalizeTypePanel(parsed.typePanel),
    map: normalizeBoxLayout(parsed.map, DEFAULT_HOME_DESIGN.map, { stackMobile: true }),
    listings: normalizeBoxLayout(parsed.listings, DEFAULT_HOME_DESIGN.listings),
    serviceRail: {
      ...DEFAULT_HOME_DESIGN.serviceRail,
      ...parsed.serviceRail,
      itemW: parsed.serviceRail?.itemW ?? legacyDiameter ?? DEFAULT_HOME_DESIGN.serviceRail.itemW,
      itemH: parsed.serviceRail?.itemH ?? legacyDiameter ?? DEFAULT_HOME_DESIGN.serviceRail.itemH,
      opacity: clampOpacity(
        parsed.serviceRail?.opacity,
        DEFAULT_HOME_DESIGN.serviceRail.opacity
      ),
      hiddenModeIds: normalizeHiddenModeIds(
        (parsed.serviceRail as { hiddenModeIds?: unknown } | undefined)?.hiddenModeIds
      ),
      items: serviceItems.map((it) => normalizeRailItem(it, 'svc')),
    },
    quickRail: {
      ...DEFAULT_HOME_DESIGN.quickRail,
      ...parsed.quickRail,
      opacity: clampOpacity(parsed.quickRail?.opacity, DEFAULT_HOME_DESIGN.quickRail.opacity),
      hiddenModeIds: normalizeHiddenModeIds(
        (parsed.quickRail as { hiddenModeIds?: unknown } | undefined)?.hiddenModeIds
      ),
      items: quickItems.map((it) => normalizeRailItem(it, 'quick')),
    },
    socialLinks: normalizeSiteSocialLinks(
      (parsed as { socialLinks?: Partial<SiteSocialLinks> }).socialLinks
    ),
  });
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
