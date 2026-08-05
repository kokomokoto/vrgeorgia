/** Dynamic homepage theme modes (day / twilight / night + custom) */

import {
  DEFAULT_THEME_PALETTES,
  normalizeThemePalette,
  type ThemeModeId,
  type ThemePalette,
  type ThemePalettes,
} from '@/lib/themePalettes';

export type ThemeBaseTone = 'light' | 'twilight' | 'dark';

export type ThemeModeDef = {
  id: string;
  label: string;
  /** DOM/CSS tone: light | twilight | dark */
  baseTone: ThemeBaseTone;
  enabled: boolean;
  palette: ThemePalette;
  imageIds: string[];
  rotationIds: string[];
  /** Optional header bar background media (per mode) */
  headerBgImageId?: string;
  headerBgMediaUrl?: string;
  headerBgMediaKind?: 'image' | 'gif' | 'video';
  /**
   * Optional custom Unicode emoji for the theme-toggle button.
   * Falls back to THEME_BASE_TONE_ICONS[baseTone] (☀️/🌅/🌙).
   */
  toggleIconEmoji?: string;
  /**
   * Optional theme-toggle button media for this mode.
   * Media replaces emoji when set. Outside Design Mode the switcher shows
   * the “next” mode’s icon; in Design Mode it shows the active mode’s icon.
   */
  toggleIconImageId?: string;
  toggleIconMediaUrl?: string;
  toggleIconMediaKind?: 'image' | 'gif' | 'video';
};

export const BUILTIN_THEME_MODE_IDS = ['day', 'twilight', 'night'] as const;
export type BuiltinThemeModeId = (typeof BUILTIN_THEME_MODE_IDS)[number];

export const THEME_BASE_TONE_LABELS: Record<ThemeBaseTone, string> = {
  light: 'ნათელი (დღე)',
  twilight: 'შუალედური',
  dark: 'ბნელი (ღამე)',
};

export const THEME_BASE_TONE_ICONS: Record<ThemeBaseTone, string> = {
  light: '☀️',
  twilight: '🌅',
  dark: '🌙',
};

/** Default toggle glyphs are Unicode emoji characters — not image/SVG files. */

/** Max length for a custom toggle emoji (grapheme-ish; allows ZWJ sequences). */
const TOGGLE_EMOJI_MAX_CHARS = 16;

export function normalizeToggleIconEmoji(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, TOGGLE_EMOJI_MAX_CHARS);
}

export function resolveToggleIconEmoji(mode: {
  baseTone: ThemeBaseTone;
  toggleIconEmoji?: string;
}): string {
  const custom = normalizeToggleIconEmoji(mode.toggleIconEmoji);
  return custom || THEME_BASE_TONE_ICONS[mode.baseTone];
}

export function isBuiltinThemeModeId(id: string): id is BuiltinThemeModeId {
  return id === 'day' || id === 'twilight' || id === 'night';
}

export function isThemeBaseTone(value: unknown): value is ThemeBaseTone {
  return value === 'light' || value === 'twilight' || value === 'dark';
}

export function baseToneFromBuiltinId(id: BuiltinThemeModeId): ThemeBaseTone {
  if (id === 'night') return 'dark';
  if (id === 'twilight') return 'twilight';
  return 'light';
}

export function builtinIdFromBaseTone(tone: ThemeBaseTone): BuiltinThemeModeId {
  if (tone === 'dark') return 'night';
  if (tone === 'twilight') return 'twilight';
  return 'day';
}

function newModeId() {
  return `mode-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultThemeModes(): ThemeModeDef[] {
  return [
    {
      id: 'day',
      label: 'დღის რეჟიმი',
      baseTone: 'light',
      enabled: true,
      palette: { ...DEFAULT_THEME_PALETTES.day },
      imageIds: [],
      rotationIds: [],
    },
    {
      id: 'twilight',
      label: 'შუალედური რეჟიმი',
      baseTone: 'twilight',
      enabled: true,
      palette: { ...DEFAULT_THEME_PALETTES.twilight },
      imageIds: [],
      rotationIds: [],
    },
    {
      id: 'night',
      label: 'ღამის რეჟიმი',
      baseTone: 'dark',
      enabled: true,
      palette: { ...DEFAULT_THEME_PALETTES.night },
      imageIds: [],
      rotationIds: [],
    },
  ];
}

export function createThemeMode(from?: ThemeModeDef | null): ThemeModeDef {
  const base = from || createDefaultThemeModes()[0];
  return {
    id: newModeId(),
    label: 'ახალი რეჟიმი',
    baseTone: base.baseTone,
    enabled: true,
    palette: { ...base.palette },
    imageIds: [],
    rotationIds: [],
    headerBgImageId: undefined,
    headerBgMediaUrl: undefined,
    headerBgMediaKind: undefined,
    toggleIconEmoji: undefined,
    toggleIconImageId: undefined,
    toggleIconMediaUrl: undefined,
    toggleIconMediaKind: undefined,
  };
}

function asStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function normalizeThemeModeDef(
  raw: Partial<ThemeModeDef> | null | undefined,
  fallback: ThemeModeDef
): ThemeModeDef {
  const imageIds = asStringIds(raw?.imageIds);
  const rotationRaw = asStringIds(raw?.rotationIds);
  const rotationIds =
    rotationRaw.length > 0
      ? imageIds.filter((id) => rotationRaw.includes(id))
      : [...imageIds];
  const baseTone = isThemeBaseTone(raw?.baseTone) ? raw.baseTone : fallback.baseTone;
  const id =
    typeof raw?.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : fallback.id || newModeId();
  const label =
    typeof raw?.label === 'string' && raw.label.trim()
      ? raw.label.trim()
      : fallback.label;
  return {
    id,
    label,
    baseTone,
    enabled: raw?.enabled !== false,
    palette: normalizeThemePalette(raw?.palette, fallback.palette),
    imageIds,
    rotationIds,
    headerBgImageId:
      typeof raw?.headerBgImageId === 'string' && raw.headerBgImageId.trim()
        ? raw.headerBgImageId.trim()
        : undefined,
    headerBgMediaUrl:
      typeof raw?.headerBgMediaUrl === 'string' && raw.headerBgMediaUrl.trim()
        ? raw.headerBgMediaUrl.trim()
        : undefined,
    headerBgMediaKind:
      raw?.headerBgMediaKind === 'image' ||
      raw?.headerBgMediaKind === 'gif' ||
      raw?.headerBgMediaKind === 'video'
        ? raw.headerBgMediaKind
        : undefined,
    toggleIconEmoji: normalizeToggleIconEmoji(raw?.toggleIconEmoji),
    toggleIconImageId:
      typeof raw?.toggleIconImageId === 'string' && raw.toggleIconImageId.trim()
        ? raw.toggleIconImageId.trim()
        : undefined,
    toggleIconMediaUrl:
      typeof raw?.toggleIconMediaUrl === 'string' && raw.toggleIconMediaUrl.trim()
        ? raw.toggleIconMediaUrl.trim()
        : undefined,
    toggleIconMediaKind:
      raw?.toggleIconMediaKind === 'image' ||
      raw?.toggleIconMediaKind === 'gif' ||
      raw?.toggleIconMediaKind === 'video'
        ? raw.toggleIconMediaKind
        : undefined,
  };
}

type LegacyHeroGallery = {
  enabledModes?: unknown;
  dayImageIds?: unknown;
  dayRotationIds?: unknown;
  twilightImageIds?: unknown;
  twilightRotationIds?: unknown;
  nightImageIds?: unknown;
  nightRotationIds?: unknown;
};

/** Build themeModes from saved array or migrate legacy hero + palettes. */
export function normalizeThemeModes(
  rawModes: unknown,
  legacyHero?: LegacyHeroGallery | null,
  legacyPalettes?: Partial<Record<ThemeModeId, Partial<ThemePalette>>> | null
): ThemeModeDef[] {
  const defaults = createDefaultThemeModes();

  if (Array.isArray(rawModes) && rawModes.length > 0) {
    const normalized = rawModes
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const fallback = defaults[Math.min(index, defaults.length - 1)] || defaults[0];
        return normalizeThemeModeDef(item as Partial<ThemeModeDef>, {
          ...fallback,
          id: `mode-${index}`,
        });
      })
      .filter((m): m is ThemeModeDef => m !== null);

    if (normalized.length === 0) return defaults;
    if (!normalized.some((m) => m.enabled)) {
      normalized[0] = { ...normalized[0], enabled: true };
    }
    return normalized;
  }

  const enabledRaw = Array.isArray(legacyHero?.enabledModes)
    ? legacyHero!.enabledModes
    : ['day', 'twilight', 'night'];
  const enabledSet = new Set(
    enabledRaw.filter(
      (m): m is BuiltinThemeModeId =>
        m === 'day' || m === 'twilight' || m === 'night'
    )
  );
  if (enabledSet.size === 0) {
    enabledSet.add('day');
    enabledSet.add('twilight');
    enabledSet.add('night');
  }

  const dayIds = asStringIds(legacyHero?.dayImageIds);
  const twilightIds = asStringIds(legacyHero?.twilightImageIds);
  const nightIds = asStringIds(legacyHero?.nightImageIds);
  const dayRot = asStringIds(legacyHero?.dayRotationIds);
  const twilightRot = asStringIds(legacyHero?.twilightRotationIds);
  const nightRot = asStringIds(legacyHero?.nightRotationIds);

  return defaults.map((mode) => {
    const paletteFallback = DEFAULT_THEME_PALETTES[mode.id as ThemeModeId];
    const imageIds =
      mode.id === 'day' ? dayIds : mode.id === 'twilight' ? twilightIds : nightIds;
    const rotationSource =
      mode.id === 'day' ? dayRot : mode.id === 'twilight' ? twilightRot : nightRot;
    return {
      ...mode,
      enabled: enabledSet.has(mode.id as BuiltinThemeModeId),
      palette: normalizeThemePalette(legacyPalettes?.[mode.id as ThemeModeId], paletteFallback),
      imageIds,
      rotationIds:
        rotationSource.length > 0
          ? imageIds.filter((id) => rotationSource.includes(id))
          : [...imageIds],
    };
  });
}

/** Keep legacy hero gallery + themePalettes fields in sync for older code paths. */
export function legacyFieldsFromThemeModes(modes: ThemeModeDef[]): {
  enabledModes: Array<'day' | 'twilight' | 'night'>;
  dayImageIds: string[];
  dayRotationIds: string[];
  twilightImageIds: string[];
  twilightRotationIds: string[];
  nightImageIds: string[];
  nightRotationIds: string[];
  themePalettes: ThemePalettes;
} {
  const byId = new Map(modes.map((m) => [m.id, m]));
  const day = byId.get('day');
  const twilight = byId.get('twilight');
  const night = byId.get('night');

  const enabledBuiltin = modes
    .filter((m) => m.enabled && isBuiltinThemeModeId(m.id))
    .map((m) => m.id as BuiltinThemeModeId);

  // If only customs are enabled, map their tones onto builtin enable list for CSS cycling fallback
  const enabledFromCustoms = modes
    .filter((m) => m.enabled && !isBuiltinThemeModeId(m.id))
    .map((m) => builtinIdFromBaseTone(m.baseTone));

  const enabledModes =
    enabledBuiltin.length > 0
      ? enabledBuiltin
      : enabledFromCustoms.length > 0
        ? Array.from(new Set(enabledFromCustoms))
        : (['day', 'twilight', 'night'] as BuiltinThemeModeId[]);

  return {
    enabledModes,
    dayImageIds: day?.imageIds || [],
    dayRotationIds: day?.rotationIds || [],
    twilightImageIds: twilight?.imageIds || [],
    twilightRotationIds: twilight?.rotationIds || [],
    nightImageIds: night?.imageIds || [],
    nightRotationIds: night?.rotationIds || [],
    themePalettes: {
      day: day?.palette || { ...DEFAULT_THEME_PALETTES.day },
      twilight: twilight?.palette || { ...DEFAULT_THEME_PALETTES.twilight },
      night: night?.palette || { ...DEFAULT_THEME_PALETTES.night },
    },
  };
}

/** Restore builtin night / dark-tone palettes to the original master dark look. */
export function restoreOriginalNightPalettes(modes: ThemeModeDef[]): ThemeModeDef[] {
  const nightPalette = { ...DEFAULT_THEME_PALETTES.night };
  return modes.map((mode) => {
    if (mode.id === 'night' || mode.baseTone === 'dark') {
      return { ...mode, palette: { ...nightPalette } };
    }
    return mode;
  });
}

export function getEnabledThemeModes(modes: ThemeModeDef[]): ThemeModeDef[] {
  const enabled = modes.filter((m) => m.enabled);
  return enabled.length > 0 ? enabled : modes.slice(0, 1);
}

export function findThemeMode(
  modes: ThemeModeDef[],
  modeId: string | null | undefined
): ThemeModeDef | undefined {
  if (!modeId) return undefined;
  return modes.find((m) => m.id === modeId);
}

export function resolveActiveThemeMode(
  modes: ThemeModeDef[],
  activeModeId: string | null | undefined,
  baseTone?: ThemeBaseTone | null
): ThemeModeDef {
  const enabled = getEnabledThemeModes(modes);
  const byId = findThemeMode(enabled, activeModeId) || findThemeMode(modes, activeModeId);
  if (byId) return byId;
  if (baseTone) {
    const byTone = enabled.find((m) => m.baseTone === baseTone);
    if (byTone) return byTone;
  }
  return enabled[0] || modes[0] || createDefaultThemeModes()[0];
}

export function allThemeModeImageIds(modes: ThemeModeDef[]): string[] {
  const ids: string[] = [];
  for (const mode of modes) {
    for (const id of mode.imageIds) ids.push(id);
    if (mode.headerBgImageId) ids.push(mode.headerBgImageId);
    if (mode.toggleIconImageId) ids.push(mode.toggleIconImageId);
  }
  return ids;
}

export function nextThemeModeId(
  modes: ThemeModeDef[],
  currentId: string
): string {
  const enabled = getEnabledThemeModes(modes);
  const i = enabled.findIndex((m) => m.id === currentId);
  if (i < 0) return enabled[0]?.id || currentId;
  return enabled[(i + 1) % enabled.length].id;
}
