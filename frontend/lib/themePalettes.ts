/** Per-theme visual atmosphere — editable in Design Mode */

export type ThemeModeId = 'day' | 'twilight' | 'night';

/** Basemap tiles for the homepage / map views */
export type MapTileStyle = 'auto' | 'light' | 'dark' | 'voyager' | 'positron';

export type ThemePalette = {
  /** Solid page background */
  bodyBg: string;
  /** Primary body text */
  textColor: string;
  /** Sticky header glass fill (supports rgba) */
  headerBg: string;
  /** Header / nav link text */
  headerText: string;
  /** Accent / link highlight / primary actions */
  accentColor: string;
  /** Secondary / muted text (descriptions, hints) */
  mutedText: string;
  /** Cards, panels, listing footers */
  surfaceBg: string;
  /** Card / panel borders */
  surfaceBorder: string;
  /** Property price & title highlight */
  priceColor: string;
  /** Map basemap style */
  mapTiles: MapTileStyle;
  /** Soft radial glow colors */
  glow1: string;
  glow1Opacity: number;
  glow2: string;
  glow2Opacity: number;
  glow3: string;
  glow3Opacity: number;
  /** Base gradient stops behind the page */
  gradientFrom: string;
  gradientMid: string;
  gradientTo: string;
  /** Grid overlay */
  gridColor: string;
  gridOpacity: number;
};

export type ThemePalettes = Record<ThemeModeId, ThemePalette>;

export const THEME_MODE_LABELS: Record<ThemeModeId, string> = {
  day: 'დღის რეჟიმი',
  twilight: 'შუალედური რეჟიმი',
  night: 'ღამის რეჟიმი',
};

export const MAP_TILE_OPTIONS: { id: MapTileStyle; label: string }[] = [
  { id: 'auto', label: 'ავტო (რეჟიმის მიხედვით)' },
  { id: 'light', label: 'ნათელი (OSM)' },
  { id: 'dark', label: 'ბნელი' },
  { id: 'voyager', label: 'Voyager' },
  { id: 'positron', label: 'Positron' },
];

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; OpenStreetMap contributors';
const CARTO_ATTR = '&copy; OpenStreetMap &copy; CARTO';

function cartoApiKey(): string {
  return (process.env.NEXT_PUBLIC_CARTO_API_KEY || '').trim();
}

function cartoTileUrl(path: string): string {
  const key = cartoApiKey();
  const url = `https://{s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}{r}.png`;
  return key ? `${url}?apikey=${encodeURIComponent(key)}` : OSM_TILE_URL;
}

export const MAP_TILE_URLS: Record<Exclude<MapTileStyle, 'auto'>, string> = {
  light: OSM_TILE_URL,
  dark: cartoTileUrl('dark_all'),
  voyager: cartoTileUrl('rastertiles/voyager'),
  positron: cartoTileUrl('light_all'),
};

export type MapBasemapClass = 'dark' | 'positron' | null;

export type MapTileLayerConfig = {
  url: string;
  attribution: string;
  /** CSS class on the Leaflet container when Carto is unavailable */
  paneClass: MapBasemapClass;
};

export function resolveMapTileStyle(
  style: MapTileStyle | undefined,
  isDark: boolean
): Exclude<MapTileStyle, 'auto'> {
  if (style && style !== 'auto') return style;
  return isDark ? 'dark' : 'light';
}

export function resolveMapTileConfig(
  style: MapTileStyle | undefined,
  isDark: boolean
): MapTileLayerConfig {
  const resolved = resolveMapTileStyle(style, isDark);
  const key = cartoApiKey();
  if (key && resolved !== 'light') {
    return {
      url: MAP_TILE_URLS[resolved],
      attribution: CARTO_ATTR,
      paneClass: null,
    };
  }
  return {
    url: OSM_TILE_URL,
    attribution: OSM_ATTR,
    paneClass: resolved === 'dark' ? 'dark' : resolved === 'positron' ? 'positron' : null,
  };
}

export function resolveMapTileUrl(style: MapTileStyle | undefined, isDark: boolean): string {
  return resolveMapTileConfig(style, isDark).url;
}

export const DEFAULT_THEME_PALETTES: ThemePalettes = {
  day: {
    bodyBg: '#e8eef6',
    textColor: '#0f172a',
    headerBg: 'rgba(255, 255, 255, 0.85)',
    headerText: '#334155',
    accentColor: '#1d4ed8',
    mutedText: '#64748b',
    surfaceBg: '#ffffff',
    surfaceBorder: '#e2e8f0',
    priceColor: '#0f172a',
    mapTiles: 'auto',
    glow1: '#3b82f6',
    glow1Opacity: 0.22,
    glow2: '#38bdf8',
    glow2Opacity: 0.14,
    glow3: '#6366f1',
    glow3Opacity: 0.1,
    gradientFrom: '#dce6f2',
    gradientMid: '#e8eef6',
    gradientTo: '#ffffff',
    gridColor: '#64748b',
    gridOpacity: 0.4,
  },
  twilight: {
    bodyBg: '#f3e8de',
    textColor: '#0f172a',
    headerBg: 'rgba(255, 247, 237, 0.78)',
    headerText: '#9a3412',
    accentColor: '#c2410c',
    mutedText: '#9a3412',
    surfaceBg: '#fff7ed',
    surfaceBorder: '#fed7aa',
    priceColor: '#9a3412',
    mapTiles: 'voyager',
    glow1: '#fb923c',
    glow1Opacity: 0.28,
    glow2: '#f472b6',
    glow2Opacity: 0.12,
    glow3: '#6366f1',
    glow3Opacity: 0.12,
    gradientFrom: '#f6d5b8',
    gradientMid: '#efe6df',
    gradientTo: '#fffaf5',
    gridColor: '#b45309',
    gridOpacity: 0.32,
  },
  night: {
    bodyBg: '#020617',
    textColor: '#fbbf24',
    headerBg: 'rgba(3, 7, 18, 0.82)',
    headerText: '#fbbf24',
    accentColor: '#fbbf24',
    mutedText: '#e4e4e7',
    surfaceBg: '#18181b',
    surfaceBorder: '#3f3f46',
    priceColor: '#fbbf24',
    mapTiles: 'dark',
    glow1: '#f59e0b',
    glow1Opacity: 0.14,
    glow2: '#3b82f6',
    glow2Opacity: 0.1,
    glow3: '#b45309',
    glow3Opacity: 0.08,
    gradientFrom: '#020617',
    gradientMid: '#030712',
    gradientTo: '#0a0a0a',
    gridColor: '#f59e0b',
    gridOpacity: 0.22,
  },
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGBA_RE =
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function asColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX_RE.test(v) || RGBA_RE.test(v)) return v;
  return fallback;
}

function asHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return HEX_RE.test(v) ? v : fallback;
}

function asMapTiles(value: unknown, fallback: MapTileStyle): MapTileStyle {
  if (
    value === 'auto' ||
    value === 'light' ||
    value === 'dark' ||
    value === 'voyager' ||
    value === 'positron'
  ) {
    return value;
  }
  return fallback;
}

function expandHex(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return `#${h}`;
}

/** Convert #RGB / #RRGGBB to rgba() */
export function hexToRgba(hex: string, opacity: number): string {
  const full = expandHex(hex);
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(opacity)})`;
}

function contrastInk(hex: string): string {
  const full = expandHex(hex);
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? '#000000' : '#ffffff';
}

/** Best-effort parse of rgba()/hex into color picker hex + opacity */
export function parseColorWithOpacity(
  value: string,
  fallbackHex = '#ffffff'
): { hex: string; opacity: number } {
  const rgba = value.match(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)/i
  );
  if (rgba) {
    const r = Math.min(255, Number(rgba[1]));
    const g = Math.min(255, Number(rgba[2]));
    const b = Math.min(255, Number(rgba[3]));
    const opacity = rgba[4] !== undefined ? clamp01(Number(rgba[4])) : 1;
    const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
    return { hex, opacity };
  }
  if (HEX_RE.test(value.trim())) {
    return { hex: expandHex(value.trim()), opacity: 1 };
  }
  return { hex: expandHex(fallbackHex), opacity: 1 };
}

export function normalizeThemePalette(
  raw: Partial<ThemePalette> | null | undefined,
  fallback: ThemePalette
): ThemePalette {
  return {
    bodyBg: asHex(raw?.bodyBg, fallback.bodyBg),
    textColor: asHex(raw?.textColor, fallback.textColor),
    headerBg: asColor(raw?.headerBg, fallback.headerBg),
    headerText: asHex(raw?.headerText, fallback.headerText),
    accentColor: asHex(raw?.accentColor, fallback.accentColor),
    mutedText: asHex(raw?.mutedText, fallback.mutedText),
    surfaceBg: asHex(raw?.surfaceBg, fallback.surfaceBg),
    surfaceBorder: asHex(raw?.surfaceBorder, fallback.surfaceBorder),
    priceColor: asHex(raw?.priceColor, fallback.priceColor),
    mapTiles: asMapTiles(raw?.mapTiles, fallback.mapTiles),
    glow1: asHex(raw?.glow1, fallback.glow1),
    glow1Opacity: clamp01(
      typeof raw?.glow1Opacity === 'number' ? raw.glow1Opacity : fallback.glow1Opacity
    ),
    glow2: asHex(raw?.glow2, fallback.glow2),
    glow2Opacity: clamp01(
      typeof raw?.glow2Opacity === 'number' ? raw.glow2Opacity : fallback.glow2Opacity
    ),
    glow3: asHex(raw?.glow3, fallback.glow3),
    glow3Opacity: clamp01(
      typeof raw?.glow3Opacity === 'number' ? raw.glow3Opacity : fallback.glow3Opacity
    ),
    gradientFrom: asHex(raw?.gradientFrom, fallback.gradientFrom),
    gradientMid: asHex(raw?.gradientMid, fallback.gradientMid),
    gradientTo: asHex(raw?.gradientTo, fallback.gradientTo),
    gridColor: asHex(raw?.gridColor, fallback.gridColor),
    gridOpacity: clamp01(
      typeof raw?.gridOpacity === 'number' ? raw.gridOpacity : fallback.gridOpacity
    ),
  };
}

export function normalizeThemePalettes(
  raw?: Partial<Record<ThemeModeId, Partial<ThemePalette>>> | null
): ThemePalettes {
  return {
    day: normalizeThemePalette(raw?.day, DEFAULT_THEME_PALETTES.day),
    twilight: normalizeThemePalette(raw?.twilight, DEFAULT_THEME_PALETTES.twilight),
    night: normalizeThemePalette(raw?.night, DEFAULT_THEME_PALETTES.night),
  };
}

export function themeModeFromThemeClass(
  theme: 'light' | 'twilight' | 'dark'
): ThemeModeId {
  if (theme === 'dark') return 'night';
  if (theme === 'twilight') return 'twilight';
  return 'day';
}

/** Push palette into CSS custom properties on <html> */
export function applyThemePaletteToDom(palette: ThemePalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.setProperty('--theme-body-bg', palette.bodyBg);
  root.setProperty('--theme-text', palette.textColor);
  root.setProperty('--theme-header-bg', palette.headerBg);
  root.setProperty('--theme-header-text', palette.headerText);
  root.setProperty('--theme-accent', palette.accentColor);
  root.setProperty('--theme-accent-ink', contrastInk(palette.accentColor));
  root.setProperty('--theme-muted-text', palette.mutedText);
  root.setProperty('--theme-surface-bg', palette.surfaceBg);
  root.setProperty('--theme-surface-border', palette.surfaceBorder);
  root.setProperty('--theme-price', palette.priceColor);
  root.setProperty('--theme-glow-1', hexToRgba(palette.glow1, palette.glow1Opacity));
  root.setProperty('--theme-glow-2', hexToRgba(palette.glow2, palette.glow2Opacity));
  root.setProperty('--theme-glow-3', hexToRgba(palette.glow3, palette.glow3Opacity));
  root.setProperty('--theme-grad-from', palette.gradientFrom);
  root.setProperty('--theme-grad-mid', palette.gradientMid);
  root.setProperty('--theme-grad-to', palette.gradientTo);
  root.setProperty('--theme-grid-color', hexToRgba(palette.gridColor, 0.08));
  root.setProperty('--theme-grid-opacity', String(palette.gridOpacity));
  document.documentElement.dataset.mapTiles = palette.mapTiles;
  window.dispatchEvent(
    new CustomEvent('theme-palette-changed', { detail: { mapTiles: palette.mapTiles } })
  );
}
