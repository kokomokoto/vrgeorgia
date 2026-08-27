'use client';

import React from 'react';
import {
  DEFAULT_HOME_DESIGN,
  HOME_DESIGN_STORAGE_KEY,
  applyRailItemModePatch,
  applyTypePanelItemModePatch,
  collectItemImageIds,
  createHeroImageId,
  createRailImageId,
  createRailItem,
  syncLegacyThemeFields,
  type DesignableId,
  type HeroLayout,
  type HeaderLayout,
  type HeaderItemId,
  type HeroTextLayout,
  type HomeDesignLayout,
  type RailItem,
  type SearchLayout,
  type SearchControlId,
  type SearchControlLayout,
  type DealChipId,
  type DealChipLayout,
  type DealBarLayout,
  normalizeSearchControl,
  normalizeDealChip,
  clampOpacity,
  clampHeaderItemGapPx,
  DEFAULT_SEARCH_CONTROLS,
  DEFAULT_DEAL_CHIPS,
  type TypePanelItem,
  loadHomeDesign,
  saveHomeDesign,
  normalizeHomeDesignInput,
  HERO_MOBILE_STACK_GAP_DEFAULT,
  HERO_H_MIN,
  HERO_H_MAX,
  copyDefaultHeaderItemPositions,
  applyDefaultGeometry,
  packHeaderItemPositions,
  headerItemIdsHiddenByStyle,
  HEADER_ITEM_IDS,
} from '@/lib/homeDesignLayout';
import { getHomeDesignLayout, saveHomeDesignLayout } from '@/lib/api';
import {
  listHomeDesignPresets,
  createHomeDesignPreset,
  updateHomeDesignPreset,
  deleteHomeDesignPreset,
  type HomeDesignPresetMeta,
} from '@/lib/api';
import { normalizeSiteSocialLinks } from '@/lib/siteSocialLinks';
import { uploadLocalBlobsInLayout } from '@/lib/homeDesignPublish';
import {
  DEFAULT_THEME_PALETTES,
  normalizeThemePalette,
  type ThemePalette,
} from '@/lib/themePalettes';
import {
  MAX_HERO_IMAGES_PER_MODE,
  deleteHeroImageBlob,
  putHeroImageBlob,
} from '@/lib/heroImageStorage';
import {
  detectMediaKindFromFile,
  detectMediaKindFromUrl,
  isBlobMediaId,
  makeExternalMediaId,
  normalizeMediaUrlInput,
  prepareDesignMediaFile,
} from '@/lib/designMedia';
import {
  allThemeModeImageIds,
  builtinIdFromBaseTone,
  createThemeMode,
  getEnabledThemeModes,
  normalizeToggleIconEmoji,
  restoreOriginalNightPalettes,
  type ThemeBaseTone,
  type ThemeModeDef,
} from '@/lib/themeModes';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole } from '@/lib/userRoles';

const MAX_HISTORY = 60;
export const HOME_DESIGN_THEME_MODES_EVENT = 'home-design-theme-modes';

function cloneLayout(layout: HomeDesignLayout): HomeDesignLayout {
  return JSON.parse(JSON.stringify(layout)) as HomeDesignLayout;
}

function layoutsEqual(a: HomeDesignLayout, b: HomeDesignLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withSyncedLegacy(layout: HomeDesignLayout): HomeDesignLayout {
  return syncLegacyThemeFields(layout);
}

function allHeroIds(layout: HomeDesignLayout): string[] {
  return allThemeModeImageIds(layout.themeModes || []).filter(isBlobMediaId);
}

function allRailImageIds(layout: HomeDesignLayout): string[] {
  return [
    ...collectItemImageIds(layout.serviceRail.items),
    ...collectItemImageIds(layout.quickRail.items),
    ...collectItemImageIds(layout.typePanel.items || []),
  ].filter(isBlobMediaId);
}

function allDesignImageIds(layout: HomeDesignLayout): string[] {
  return [...allHeroIds(layout), ...allRailImageIds(layout)];
}

function updateThemeModeInLayout(
  prev: HomeDesignLayout,
  modeId: string,
  updater: (mode: ThemeModeDef) => ThemeModeDef
): HomeDesignLayout {
  const themeModes = prev.themeModes.map((mode) =>
    mode.id === modeId ? updater(mode) : mode
  );
  return withSyncedLegacy({ ...prev, themeModes });
}

/** Canvas drag/resize → which inspector fields to highlight */
export type DesignEditParam =
  | 'x'
  | 'y'
  | 'w'
  | 'h'
  | 'mobileX'
  | 'mobileY'
  | 'itemW'
  | 'itemH'
  | 'headerH'
  | 'posX'
  | 'posY'
  | 'labelX'
  | 'labelY'
  | 'countX'
  | 'countY'
  | 'iconX'
  | 'iconY'
  | 'mediaX'
  | 'mediaY'
  | 'mediaScale';

type HomeDesignContextValue = {
  designMode: boolean;
  /** Admin-only — false for guests / non-admins */
  canDesignMode: boolean;
  setDesignMode: (on: boolean) => void;
  layout: HomeDesignLayout;
  selectedId: DesignableId | null;
  setSelectedId: (id: DesignableId | null) => void;
  /** When a rail circle/card is clicked in Design Mode */
  selectedRailItemId: string | null;
  setSelectedRailItemId: (id: string | null) => void;
  /** When a property-type category card is clicked in Design Mode */
  selectedTypeItemId: string | null;
  setSelectedTypeItemId: (id: string | null) => void;
  /** When a search-row control (ფასი…) is clicked in Design Mode */
  selectedSearchControlId: SearchControlId | null;
  setSelectedSearchControlId: (id: SearchControlId | null) => void;
  /** When a deal chip is clicked in Design Mode */
  selectedDealChipId: DealChipId | null;
  setSelectedDealChipId: (id: DealChipId | null) => void;
  /** Header child folder (logo, nav item…) — null = header root */
  selectedHeaderItemId: HeaderItemId | null;
  setSelectedHeaderItemId: (id: HeaderItemId | null) => void;
  /**
   * Params currently being changed on canvas (move → x/y, resize → w/h…).
   * Inspector highlights matching fields.
   */
  activeEditParams: DesignEditParam[];
  setActiveEditParams: (params: DesignEditParam[]) => void;
  /** Working copy differs from last saved layout */
  isDirty: boolean;
  /** True while publishing layout + media to the server */
  saving: boolean;
  /** Persist working layout to server (and local cache) */
  saveDesignChanges: () => Promise<void>;
  /** Revert working layout to last saved (without exiting) */
  discardDesignChanges: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Call once at start of drag/resize so the whole gesture is one undo step */
  beginHistoryGesture: () => void;
  endHistoryGesture: () => void;
  updateBox: (
    id: 'heroText' | 'search' | 'map' | 'typePanel' | 'dealBar' | 'listings',
    patch: Partial<HomeDesignLayout['search']> &
      Partial<Pick<HomeDesignLayout['typePanel'], 'pad' | 'gap'>>
  ) => void;
  updateSearch: (patch: Partial<SearchLayout>) => void;
  updateSearchControl: (id: SearchControlId, patch: Partial<SearchControlLayout>) => void;
  updateDealChip: (id: DealChipId, patch: Partial<DealChipLayout>) => void;
  updateHero: (patch: Partial<HeroLayout>) => void;
  updateHeader: (patch: Partial<HeaderLayout>) => void;
  updateHeroText: (patch: Partial<HeroTextLayout>) => void;
  addHeroImages: (modeId: string, files: File[]) => Promise<void>;
  addHeroMediaUrl: (modeId: string, url: string) => boolean;
  removeHeroImage: (modeId: string, imageId: string) => Promise<void>;
  moveHeroImage: (modeId: string, imageId: string, dir: -1 | 1) => void;
  toggleHeroRotationImage: (modeId: string, imageId: string) => void;
  toggleHeroModeEnabled: (modeId: string) => void;
  addThemeMode: (fromModeId?: string) => string;
  removeThemeMode: (modeId: string) => boolean;
  updateThemeMode: (
    modeId: string,
    patch: Partial<Pick<ThemeModeDef, 'label' | 'baseTone' | 'enabled' | 'toggleIconEmoji'>>
  ) => void;
  updateThemePalette: (modeId: string, patch: Partial<ThemePalette>) => void;
  resetThemePalette: (modeId: string) => void;
  setHeaderBgImage: (modeId: string, file: File) => Promise<void>;
  setHeaderBgMediaUrl: (modeId: string, url: string) => boolean;
  removeHeaderBgMedia: (modeId: string) => void;
  setThemeToggleIconImage: (modeId: string, file: File) => Promise<void>;
  setThemeToggleIconMediaUrl: (modeId: string, url: string) => boolean;
  removeThemeToggleIconMedia: (modeId: string) => void;
  updateServiceRail: (patch: Partial<HomeDesignLayout['serviceRail']>) => void;
  updateQuickRail: (patch: Partial<HomeDesignLayout['quickRail']>) => void;
  updateSocialLinks: (patch: Partial<HomeDesignLayout['socialLinks']>) => void;
  addRailItem: (rail: 'serviceRail' | 'quickRail') => void;
  removeRailItem: (rail: 'serviceRail' | 'quickRail', itemId: string) => void;
  updateRailItem: (
    rail: 'serviceRail' | 'quickRail',
    itemId: string,
    patch: Partial<RailItem>
  ) => void;
  setRailItemImage: (
    rail: 'serviceRail' | 'quickRail',
    itemId: string,
    file: File
  ) => Promise<void>;
  setRailItemMediaUrl: (
    rail: 'serviceRail' | 'quickRail',
    itemId: string,
    url: string
  ) => boolean;
  removeRailItemImage: (rail: 'serviceRail' | 'quickRail', itemId: string) => void;
  updateTypePanelItem: (itemId: string, patch: Partial<TypePanelItem>) => void;
  setTypePanelItemImage: (itemId: string, file: File) => Promise<void>;
  setTypePanelItemMediaUrl: (itemId: string, url: string) => boolean;
  removeTypePanelItemImage: (itemId: string) => void;
  resetLayout: () => void;
  /** Factory default (კოდის ნაგულისხმევი) — სრული ვიზუალი */
  resetToFactoryDefault: () => void;
  designPresets: HomeDesignPresetMeta[];
  designPresetsMax: number;
  designPresetsLoading: boolean;
  refreshDesignPresets: () => Promise<void>;
  saveCurrentAsPreset: (name: string) => Promise<boolean>;
  applyDesignPreset: (presetId: string) => Promise<boolean>;
  overwriteDesignPreset: (presetId: string) => Promise<boolean>;
  removeDesignPreset: (presetId: string) => Promise<boolean>;
};

const HomeDesignContext = React.createContext<HomeDesignContextValue | null>(null);

export function HomeDesignProvider({
  children,
  initialLayout = null,
}: {
  children: React.ReactNode;
  /** SSR-fetched public layout — first paint matches saved design */
  initialLayout?: HomeDesignLayout | null;
}) {
  const { activeModeId } = useTheme();
  const { user, profileLoaded } = useAuth();
  const canDesignMode = profileLoaded && isAdminRole(user?.role);
  const canDesignModeRef = React.useRef(canDesignMode);
  React.useEffect(() => {
    canDesignModeRef.current = canDesignMode;
  }, [canDesignMode]);

  const activeModeIdRef = React.useRef(activeModeId);
  React.useEffect(() => {
    activeModeIdRef.current = activeModeId;
  }, [activeModeId]);

  const bootLayout = initialLayout ?? DEFAULT_HOME_DESIGN;
  const [designMode, setDesignModeState] = React.useState(false);
  const [layout, setLayout] = React.useState<HomeDesignLayout>(bootLayout);
  const [savedLayout, setSavedLayout] = React.useState<HomeDesignLayout>(bootLayout);
  const [selectedId, setSelectedIdState] = React.useState<DesignableId | null>(null);
  const [selectedRailItemId, setSelectedRailItemId] = React.useState<string | null>(null);
  const [selectedTypeItemId, setSelectedTypeItemId] = React.useState<string | null>(null);
  const [selectedSearchControlId, setSelectedSearchControlId] =
    React.useState<SearchControlId | null>(null);
  const [selectedDealChipId, setSelectedDealChipId] = React.useState<DealChipId | null>(null);
  const [selectedHeaderItemId, setSelectedHeaderItemId] = React.useState<HeaderItemId | null>(
    null
  );
  const [activeEditParams, setActiveEditParams] = React.useState<DesignEditParam[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const setSelectedId = React.useCallback((id: DesignableId | null) => {
    setSelectedIdState(id);
    setActiveEditParams([]);
    if (id !== 'serviceRail' && id !== 'quickRail') {
      setSelectedRailItemId(null);
    }
    if (id !== 'typePanel') {
      setSelectedTypeItemId(null);
    }
    if (id !== 'search') {
      setSelectedSearchControlId(null);
    }
    if (id !== 'dealBar') {
      setSelectedDealChipId(null);
    }
    if (id !== 'header') {
      setSelectedHeaderItemId(null);
    }
  }, []);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [designPresets, setDesignPresets] = React.useState<HomeDesignPresetMeta[]>([]);
  const [designPresetsMax, setDesignPresetsMax] = React.useState(12);
  const [designPresetsLoading, setDesignPresetsLoading] = React.useState(false);

  const layoutRef = React.useRef(layout);
  const savedLayoutRef = React.useRef(savedLayout);
  const pastRef = React.useRef<HomeDesignLayout[]>([]);
  const futureRef = React.useRef<HomeDesignLayout[]>([]);
  const gestureRef = React.useRef(false);
  const applyingHistoryRef = React.useRef(false);

  React.useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  React.useEffect(() => {
    savedLayoutRef.current = savedLayout;
  }, [savedLayout]);

  const isDirty = hydrated && !layoutsEqual(layout, savedLayout);

  const syncHistoryFlags = React.useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const clearHistory = React.useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    gestureRef.current = false;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const pushHistory = React.useCallback(() => {
    if (applyingHistoryRef.current) return;
    pastRef.current = [...pastRef.current, cloneLayout(layoutRef.current)].slice(-MAX_HISTORY);
    futureRef.current = [];
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const beginHistoryGesture = React.useCallback(() => {
    if (gestureRef.current) return;
    pushHistory();
    gestureRef.current = true;
  }, [pushHistory]);

  const endHistoryGesture = React.useCallback(() => {
    gestureRef.current = false;
  }, []);

  /** Discrete change = one undo step (unless inside an active drag gesture) */
  const commit = React.useCallback(
    (updater: (prev: HomeDesignLayout) => HomeDesignLayout) => {
      if (!gestureRef.current) pushHistory();
      setLayout(updater);
    },
    [pushHistory]
  );

  const undo = React.useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, cloneLayout(layoutRef.current)].slice(-MAX_HISTORY);
    applyingHistoryRef.current = true;
    setLayout(cloneLayout(prev));
    applyingHistoryRef.current = false;
    gestureRef.current = false;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const redo = React.useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, cloneLayout(layoutRef.current)].slice(-MAX_HISTORY);
    applyingHistoryRef.current = true;
    setLayout(cloneLayout(next));
    applyingHistoryRef.current = false;
    gestureRef.current = false;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  React.useLayoutEffect(() => {
    // Sync local cache before first paint (may be newer than SSR snapshot).
    try {
      const cached = loadHomeDesign();
      if (!layoutsEqual(cached, layoutRef.current)) {
        setLayout(cached);
      }
    } catch {
      /* keep SSR / default */
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      let next = loadHomeDesign();
      const resetKey = 'vhome-night-palette-restored-v2';
      try {
        if (!window.localStorage.getItem(resetKey)) {
          next = syncLegacyThemeFields({
            ...next,
            themeModes: restoreOriginalNightPalettes(next.themeModes || []),
          });
          saveHomeDesign(next);
          window.localStorage.setItem(resetKey, '1');
        }
      } catch {
        /* keep next */
      }

      // სერვერი = ყველა ბრაუზერის/მოწყობილობის წყარო; localStorage მხოლოდ ქეში
      try {
        const remote = await getHomeDesignLayout();
        if (!cancelled && remote?.layout) {
          next = normalizeHomeDesignInput(
            remote.layout as Partial<HomeDesignLayout>
          );
          saveHomeDesign(next);
        }
      } catch {
        /* ოფლაინ / API ჩავარდნა — ვტოვებთ local ქეშს */
      }

      // One-time: tighten old mobile stack gaps (6 default / gap-3 era ≥10)
      const gapTightKey = 'vhome-mobile-stack-gap-tight-v1';
      try {
        if (!cancelled && !window.localStorage.getItem(gapTightKey)) {
          const g = next.hero.mobileStackGap ?? 6;
          if (g === 6 || g >= 10) {
            next = {
              ...next,
              hero: { ...next.hero, mobileStackGap: HERO_MOBILE_STACK_GAP_DEFAULT },
            };
            saveHomeDesign(next);
          }
          window.localStorage.setItem(gapTightKey, '1');
        }
      } catch {
        /* keep next */
      }

      // One-time: balanced header nav defaults (left cluster + right utilities)
      const headerBalanceKey = 'vhome-header-nav-row-v5';
      try {
        if (!cancelled && !window.localStorage.getItem(headerBalanceKey)) {
          next = {
            ...next,
            header: {
              ...next.header,
              itemPositions: copyDefaultHeaderItemPositions(),
            },
          };
          saveHomeDesign(next);
          window.localStorage.setItem(headerBalanceKey, '1');
        }
      } catch {
        /* keep next */
      }

      if (cancelled) return;
      setLayout(next);
      setSavedLayout(cloneLayout(next));
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const all = layout.themeModes || [];
    // Design Mode: expose every mode (incl. disabled) so unfinished modes can be previewed/edited.
    // Public: only enabled modes cycle in the theme toggle.
    const forCycle = designMode ? all : getEnabledThemeModes(all);
    const infos =
      forCycle.length > 0
        ? forCycle
        : getEnabledThemeModes(all);
    window.dispatchEvent(
      new CustomEvent(HOME_DESIGN_THEME_MODES_EVENT, {
        detail: {
          themeModes: layout.themeModes,
          modeInfos: infos.map((m) => ({
            id: m.id,
            label: m.label,
            baseTone: m.baseTone,
          })),
          enabledModes: layout.hero.enabledModes,
          storageKey: HOME_DESIGN_STORAGE_KEY,
        },
      })
    );
  }, [hydrated, layout.themeModes, layout.hero.enabledModes, designMode]);

  /** Drop blobs added in this session but not present in the restored layout */
  const purgeOrphanHeroBlobs = React.useCallback(
    async (keep: HomeDesignLayout, dropFrom: HomeDesignLayout) => {
      const keepIds = new Set(allDesignImageIds(keep));
      for (const id of allDesignImageIds(dropFrom)) {
        if (!keepIds.has(id)) {
          try {
            await deleteHeroImageBlob(id);
          } catch {
            /* ignore */
          }
        }
      }
    },
    []
  );

  const discardDesignChanges = React.useCallback(async () => {
    const saved = cloneLayout(savedLayoutRef.current);
    const working = layoutRef.current;
    await purgeOrphanHeroBlobs(saved, working);
    setLayout(saved);
    clearHistory();
  }, [clearHistory, purgeOrphanHeroBlobs]);

  const saveDesignChanges = React.useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      let working = cloneLayout(layoutRef.current);
      const previous = savedLayoutRef.current;
      await purgeOrphanHeroBlobs(working, previous);
      // IndexedDB blobs → Cloudinary URLs, რომ სხვა ბრაუზერშიც გამოჩნდეს
      working = withSyncedLegacy(await uploadLocalBlobsInLayout(working));
      await saveHomeDesignLayout(working);
      saveHomeDesign(working);
      setSavedLayout(working);
      setLayout(working);
      clearHistory();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'დიზაინის შენახვა ვერ მოხერხდა';
      if (typeof window !== 'undefined') {
        window.alert(msg);
      }
    } finally {
      setSaving(false);
    }
  }, [clearHistory, purgeOrphanHeroBlobs, saving]);

  const setDesignMode = React.useCallback(
    (on: boolean) => {
      if (on) {
        if (!canDesignModeRef.current) return;
        clearHistory();
        setSelectedId(null);
        setDesignModeState(true);
        return;
      }

      // Exit without Save → discard unsaved edits
      if (!layoutsEqual(layoutRef.current, savedLayoutRef.current)) {
        const ok =
          typeof window === 'undefined'
            ? true
            : window.confirm(
                'უშენახავი ცვლილებები დაიკარგება.\nგამოვრთოთ Design Mode შენახვის გარეშე?'
              );
        if (!ok) return;
        void discardDesignChanges();
      }

      setSelectedId(null);
      gestureRef.current = false;
      setDesignModeState(false);
    },
    [clearHistory, discardDesignChanges]
  );

  // Non-admin / logged-out: force Design Mode off
  React.useEffect(() => {
    if (!designMode) return;
    if (canDesignMode) return;
    setSelectedId(null);
    gestureRef.current = false;
    setDesignModeState(false);
    if (!layoutsEqual(layoutRef.current, savedLayoutRef.current)) {
      void discardDesignChanges();
    }
  }, [canDesignMode, designMode, discardDesignChanges, setSelectedId]);

  // Ctrl+Z / Ctrl+Y / Ctrl+S while Design Mode is on
  React.useEffect(() => {
    if (!designMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' ||
        tag === 'textarea' ||
        target?.isContentEditable === true;

      const key = e.key.toLowerCase();

      if (key === 's') {
        e.preventDefault();
        void saveDesignChanges();
        return;
      }

      if (inField) return;

      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [designMode, undo, redo, saveDesignChanges]);

  const updateBox = React.useCallback(
    (
      id: 'heroText' | 'search' | 'map' | 'typePanel' | 'dealBar' | 'listings',
      patch: Partial<HomeDesignLayout['search']> &
        Partial<Pick<HomeDesignLayout['typePanel'], 'pad' | 'gap'>> & {
          mobileX?: number;
          mobileY?: number;
        }
    ) => {
      commit((prev) => {
        const nextPatch = { ...patch };
        if (patch.mobileX !== undefined) {
          const stack =
            id === 'dealBar' ||
            id === 'search' ||
            id === 'typePanel' ||
            id === 'map';
          nextPatch.mobileX = stack
            ? Math.max(-24, Math.min(24, Math.round(patch.mobileX)))
            : Math.max(-120, Math.min(360, Math.round(patch.mobileX)));
        }
        if (patch.mobileY !== undefined) {
          const stack =
            id === 'dealBar' ||
            id === 'search' ||
            id === 'typePanel' ||
            id === 'map';
          nextPatch.mobileY = stack
            ? Math.max(-48, Math.min(64, Math.round(patch.mobileY)))
            : Math.max(-80, Math.min(400, Math.round(patch.mobileY)));
        }
        if (patch.opacity !== undefined) {
          nextPatch.opacity = clampOpacity(patch.opacity);
        }
        return {
          ...prev,
          [id]: {
            ...prev[id],
            ...nextPatch,
          },
        };
      });
    },
    [commit]
  );

  const updateSearch = React.useCallback(
    (patch: Partial<SearchLayout>) => {
      commit((prev) => {
        const next: SearchLayout = { ...prev.search, ...patch };
        if (patch.mobileX !== undefined) {
          next.mobileX = Math.max(-24, Math.min(24, Math.round(patch.mobileX)));
        }
        if (patch.mobileY !== undefined) {
          next.mobileY = Math.max(-48, Math.min(64, Math.round(patch.mobileY)));
        }
        if (patch.controls) {
          next.controls = { ...prev.search.controls, ...patch.controls };
        }
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined && key !== 'controls') {
            delete next[key as keyof SearchLayout];
          }
        }
        return { ...prev, search: next };
      });
    },
    [commit]
  );

  const updateSearchControl = React.useCallback(
    (id: SearchControlId, patch: Partial<SearchControlLayout>) => {
      commit((prev) => {
        const fallback = prev.search.controls?.[id] ?? DEFAULT_SEARCH_CONTROLS[id];
        const merged = normalizeSearchControl(
          { ...fallback, ...patch },
          DEFAULT_SEARCH_CONTROLS[id]
        );
        return {
          ...prev,
          search: {
            ...prev.search,
            controls: {
              ...prev.search.controls,
              [id]: merged,
            },
          },
        };
      });
    },
    [commit]
  );

  const updateDealChip = React.useCallback(
    (id: DealChipId, patch: Partial<DealChipLayout>) => {
      commit((prev) => {
        const deal = prev.dealBar as DealBarLayout;
        const fallback = deal.chips?.[id] ?? DEFAULT_DEAL_CHIPS[id];
        const merged = normalizeDealChip({ ...fallback, ...patch }, DEFAULT_DEAL_CHIPS[id]);
        return {
          ...prev,
          dealBar: {
            ...deal,
            gap: deal.gap ?? 8,
            chips: {
              ...(deal.chips || DEFAULT_DEAL_CHIPS),
              [id]: merged,
            },
          },
        };
      });
    },
    [commit]
  );

  const updateHero = React.useCallback(
    (patch: Partial<HeroLayout>) => {
      commit((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          ...patch,
          h:
            patch.h !== undefined
              ? Math.max(HERO_H_MIN, Math.min(HERO_H_MAX, Math.round(patch.h)))
              : prev.hero.h,
          mobileH:
            patch.mobileH !== undefined
              ? Math.max(80, Math.min(520, Math.round(patch.mobileH)))
              : prev.hero.mobileH,
          mobileStackGap:
            patch.mobileStackGap !== undefined
              ? Math.max(0, Math.min(32, Math.round(patch.mobileStackGap)))
              : prev.hero.mobileStackGap,
          intervalSec:
            patch.intervalSec !== undefined
              ? Math.max(2, Math.min(120, Math.round(patch.intervalSec)))
              : prev.hero.intervalSec,
        },
      }));
    },
    [commit]
  );

  const updateHeroText = React.useCallback(
    (patch: Partial<HeroTextLayout>) => {
      commit((prev) => ({
        ...prev,
        heroText: {
          ...prev.heroText,
          ...patch,
          w:
            patch.w !== undefined
              ? Math.max(240, Math.min(1200, Math.round(patch.w)))
              : prev.heroText.w,
          h:
            patch.h !== undefined
              ? Math.max(72, Math.min(360, Math.round(patch.h)))
              : prev.heroText.h,
          mobileX:
            patch.mobileX !== undefined
              ? Math.max(-120, Math.min(360, Math.round(patch.mobileX)))
              : prev.heroText.mobileX,
          mobileY:
            patch.mobileY !== undefined
              ? Math.max(-80, Math.min(520, Math.round(patch.mobileY)))
              : prev.heroText.mobileY,
        },
      }));
    },
    [commit]
  );

  const updateHeader = React.useCallback(
    (patch: Partial<HeaderLayout>) => {
      commit((prev) => {
        let itemPositions = prev.header.itemPositions;
        if ('itemPositions' in patch) {
          const raw = patch.itemPositions;
          if (!raw || Object.keys(raw).length === 0) {
            itemPositions = undefined;
          } else {
            itemPositions = { ...raw };
          }
        }

        const nextHeader: HeaderLayout = {
          ...prev.header,
          ...patch,
          h:
            patch.h !== undefined
              ? Math.max(44, Math.min(120, Math.round(patch.h)))
              : prev.header.h,
          itemGapPx:
            patch.itemGapPx !== undefined
              ? clampHeaderItemGapPx(patch.itemGapPx)
              : prev.header.itemGapPx,
          brandFontSize:
            patch.brandFontSize !== undefined
              ? Math.max(12, Math.min(40, Math.round(patch.brandFontSize)))
              : prev.header.brandFontSize,
          navFontSize:
            patch.navFontSize !== undefined
              ? Math.max(10, Math.min(24, Math.round(patch.navFontSize)))
              : prev.header.navFontSize,
        };

        if (itemPositions) nextHeader.itemPositions = itemPositions;
        else delete nextHeader.itemPositions;

        return {
          ...prev,
          header: nextHeader,
        };
      });
    },
    [commit]
  );

  const addHeroImages = React.useCallback(
    async (modeId: string, files: File[]) => {
      if (!files.length) return;
      const mode = layoutRef.current.themeModes.find((m) => m.id === modeId);
      if (!mode) return;
      const room = Math.max(0, MAX_HERO_IMAGES_PER_MODE - mode.imageIds.length);
      if (room <= 0) return;

      const slice = files.slice(0, room);
      const addedIds: string[] = [];

      for (const file of slice) {
        try {
          const prepared = await prepareDesignMediaFile(file);
          const id = createHeroImageId();
          await putHeroImageBlob(id, prepared);
          addedIds.push(id);
        } catch {
          /* skip failed file */
        }
      }

      if (addedIds.length === 0) return;

      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => ({
          ...m,
          imageIds: [...m.imageIds, ...addedIds].slice(0, MAX_HERO_IMAGES_PER_MODE),
          rotationIds: [...m.rotationIds, ...addedIds].slice(0, MAX_HERO_IMAGES_PER_MODE),
        }))
      );
    },
    [commit]
  );

  const addHeroMediaUrl = React.useCallback(
    (modeId: string, rawUrl: string) => {
      const url = normalizeMediaUrlInput(rawUrl);
      if (!url) return false;
      const mode = layoutRef.current.themeModes.find((m) => m.id === modeId);
      if (!mode || mode.imageIds.length >= MAX_HERO_IMAGES_PER_MODE) return false;
      const kind = detectMediaKindFromUrl(url);
      const id = makeExternalMediaId(kind, url);
      if (mode.imageIds.includes(id)) return true;
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => ({
          ...m,
          imageIds: [...m.imageIds, id].slice(0, MAX_HERO_IMAGES_PER_MODE),
          rotationIds: [...m.rotationIds, id].slice(0, MAX_HERO_IMAGES_PER_MODE),
        }))
      );
      return true;
    },
    [commit]
  );

  const removeHeroImage = React.useCallback(
    async (modeId: string, imageId: string) => {
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => ({
          ...m,
          imageIds: m.imageIds.filter((id) => id !== imageId),
          rotationIds: m.rotationIds.filter((id) => id !== imageId),
        }))
      );
    },
    [commit]
  );

  const moveHeroImage = React.useCallback(
    (modeId: string, imageId: string, dir: -1 | 1) => {
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => {
          const list = [...m.imageIds];
          const i = list.indexOf(imageId);
          if (i < 0) return m;
          const j = i + dir;
          if (j < 0 || j >= list.length) return m;
          const tmp = list[i];
          list[i] = list[j];
          list[j] = tmp;
          const rotationSet = new Set(m.rotationIds);
          return {
            ...m,
            imageIds: list,
            rotationIds: list.filter((id) => rotationSet.has(id)),
          };
        })
      );
    },
    [commit]
  );

  const toggleHeroRotationImage = React.useCallback(
    (modeId: string, imageId: string) => {
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => {
          const selected = new Set(m.rotationIds);
          if (selected.has(imageId)) selected.delete(imageId);
          else selected.add(imageId);
          return {
            ...m,
            rotationIds: m.imageIds.filter((id) => selected.has(id)),
          };
        })
      );
    },
    [commit]
  );

  const toggleHeroModeEnabled = React.useCallback(
    (modeId: string) => {
      commit((prev) => {
        const target = prev.themeModes.find((m) => m.id === modeId);
        if (!target) return prev;
        const enabledCount = prev.themeModes.filter((m) => m.enabled).length;
        if (target.enabled && enabledCount <= 1) return prev;
        return updateThemeModeInLayout(prev, modeId, (m) => ({
          ...m,
          enabled: !m.enabled,
        }));
      });
    },
    [commit]
  );

  const addThemeMode = React.useCallback(
    (fromModeId?: string) => {
      const from =
        layoutRef.current.themeModes.find((m) => m.id === fromModeId) ||
        layoutRef.current.themeModes[0] ||
        null;
      const created = createThemeMode(from);
      commit((prev) =>
        withSyncedLegacy({
          ...prev,
          themeModes: [...prev.themeModes, created],
        })
      );
      return created.id;
    },
    [commit]
  );

  const removeThemeMode = React.useCallback(
    (modeId: string) => {
      const modes = layoutRef.current.themeModes;
      if (modes.length <= 1) return false;
      const target = modes.find((m) => m.id === modeId);
      if (!target) return false;
      const remaining = modes.filter((m) => m.id !== modeId);
      if (!remaining.some((m) => m.enabled)) {
        remaining[0] = { ...remaining[0], enabled: true };
      }
      commit((prev) =>
        withSyncedLegacy({
          ...prev,
          themeModes: remaining,
        })
      );
      return true;
    },
    [commit]
  );

  const updateThemeMode = React.useCallback(
    (
      modeId: string,
      patch: Partial<
        Pick<ThemeModeDef, 'label' | 'baseTone' | 'enabled' | 'toggleIconEmoji'>
      >
    ) => {
      commit((prev) => {
        if (patch.enabled === false) {
          const enabledCount = prev.themeModes.filter((m) => m.enabled).length;
          const target = prev.themeModes.find((m) => m.id === modeId);
          if (target?.enabled && enabledCount <= 1) return prev;
        }
        return updateThemeModeInLayout(prev, modeId, (m) => {
          const next: ThemeModeDef = {
            ...m,
            ...patch,
            label:
              typeof patch.label === 'string' && patch.label.trim()
                ? patch.label.trim()
                : m.label,
            baseTone: (patch.baseTone as ThemeBaseTone | undefined) || m.baseTone,
          };
          if ('toggleIconEmoji' in patch) {
            const emoji = normalizeToggleIconEmoji(patch.toggleIconEmoji);
            if (emoji) next.toggleIconEmoji = emoji;
            else delete next.toggleIconEmoji;
          }
          return next;
        });
      });
    },
    [commit]
  );

  const updateThemePalette = React.useCallback(
    (modeId: string, patch: Partial<ThemePalette>) => {
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => ({
          ...m,
          palette: normalizeThemePalette({ ...m.palette, ...patch }, m.palette),
        }))
      );
    },
    [commit]
  );

  const resetThemePalette = React.useCallback(
    (modeId: string) => {
      commit((prev) => {
        const source = prev.themeModes.find((m) => m.id === modeId);
        if (!source) return prev;
        const builtin = builtinIdFromBaseTone(source.baseTone);
        return updateThemeModeInLayout(prev, modeId, (m) => ({
          ...m,
          palette: { ...DEFAULT_THEME_PALETTES[builtin] },
        }));
      });
    },
    [commit]
  );

  const setHeaderBgImage = React.useCallback(
    async (modeId: string, file: File) => {
      try {
        const prepared = await prepareDesignMediaFile(file);
        const imageId = createHeroImageId();
        await putHeroImageBlob(imageId, prepared);
        const headerBgMediaKind = detectMediaKindFromFile(file);
        commit((prev) =>
          updateThemeModeInLayout(prev, modeId, (m) => {
            const next = { ...m, headerBgImageId: imageId, headerBgMediaKind };
            delete next.headerBgMediaUrl;
            return next;
          })
        );
      } catch {
        /* skip failed upload */
      }
    },
    [commit]
  );

  const setHeaderBgMediaUrl = React.useCallback(
    (modeId: string, rawUrl: string) => {
      const url = normalizeMediaUrlInput(rawUrl);
      if (!url) return false;
      const headerBgMediaKind = detectMediaKindFromUrl(url);
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => {
          const next = { ...m, headerBgMediaUrl: url, headerBgMediaKind };
          delete next.headerBgImageId;
          return next;
        })
      );
      return true;
    },
    [commit]
  );

  const removeHeaderBgMedia = React.useCallback(
    (modeId: string) => {
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => {
          const next = { ...m };
          delete next.headerBgImageId;
          delete next.headerBgMediaUrl;
          delete next.headerBgMediaKind;
          return next;
        })
      );
    },
    [commit]
  );

  const setThemeToggleIconImage = React.useCallback(
    async (modeId: string, file: File) => {
      try {
        const prepared = await prepareDesignMediaFile(file);
        const imageId = createHeroImageId();
        await putHeroImageBlob(imageId, prepared);
        const toggleIconMediaKind = detectMediaKindFromFile(file);
        commit((prev) =>
          updateThemeModeInLayout(prev, modeId, (m) => {
            const next = { ...m, toggleIconImageId: imageId, toggleIconMediaKind };
            delete next.toggleIconMediaUrl;
            return next;
          })
        );
      } catch {
        /* skip failed upload */
      }
    },
    [commit]
  );

  const setThemeToggleIconMediaUrl = React.useCallback(
    (modeId: string, rawUrl: string) => {
      const url = normalizeMediaUrlInput(rawUrl);
      if (!url) return false;
      const toggleIconMediaKind = detectMediaKindFromUrl(url);
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => {
          const next = { ...m, toggleIconMediaUrl: url, toggleIconMediaKind };
          delete next.toggleIconImageId;
          return next;
        })
      );
      return true;
    },
    [commit]
  );

  const removeThemeToggleIconMedia = React.useCallback(
    (modeId: string) => {
      commit((prev) =>
        updateThemeModeInLayout(prev, modeId, (m) => {
          const next = { ...m };
          delete next.toggleIconImageId;
          delete next.toggleIconMediaUrl;
          delete next.toggleIconMediaKind;
          return next;
        })
      );
    },
    [commit]
  );

  const updateServiceRail = React.useCallback(
    (patch: Partial<HomeDesignLayout['serviceRail']>) => {
      commit((prev) => {
        const next = { ...prev.serviceRail, ...patch };
        if ('hiddenModeIds' in patch) {
          const ids = patch.hiddenModeIds;
          if (!ids || ids.length === 0) delete next.hiddenModeIds;
          else next.hiddenModeIds = ids;
        }
        return { ...prev, serviceRail: next };
      });
    },
    [commit]
  );

  const updateQuickRail = React.useCallback(
    (patch: Partial<HomeDesignLayout['quickRail']>) => {
      commit((prev) => {
        const next = { ...prev.quickRail, ...patch };
        if ('hiddenModeIds' in patch) {
          const ids = patch.hiddenModeIds;
          if (!ids || ids.length === 0) delete next.hiddenModeIds;
          else next.hiddenModeIds = ids;
        }
        return { ...prev, quickRail: next };
      });
    },
    [commit]
  );

  const updateSocialLinks = React.useCallback(
    (patch: Partial<HomeDesignLayout['socialLinks']>) => {
      commit((prev) => ({
        ...prev,
        socialLinks: normalizeSiteSocialLinks({ ...prev.socialLinks, ...patch }),
      }));
    },
    [commit]
  );

  const addRailItem = React.useCallback(
    (rail: 'serviceRail' | 'quickRail') => {
      commit((prev) => {
        const prefix = rail === 'serviceRail' ? 'svc' : 'quick';
        const activeId = activeModeIdRef.current || 'day';
        // New cards appear only in the mode you're editing; hidden elsewhere until shown.
        const byMode: NonNullable<RailItem['byMode']> = {};
        for (const m of prev.themeModes || []) {
          if (m.id && m.id !== activeId) byMode[m.id] = { hidden: true };
        }
        const item = createRailItem(prefix, {
          label: rail === 'serviceRail' ? 'ახალი სერვისი' : 'ახალი ბმული',
          hint: rail === 'quickRail' ? 'აღწერა' : undefined,
          href: '#',
          ...(Object.keys(byMode).length ? { byMode } : {}),
        });
        return {
          ...prev,
          [rail]: {
            ...prev[rail],
            items: [...prev[rail].items, item],
          },
        };
      });
    },
    [commit]
  );

  const removeRailItem = React.useCallback(
    (rail: 'serviceRail' | 'quickRail', itemId: string) => {
      commit((prev) => ({
        ...prev,
        [rail]: {
          ...prev[rail],
          items: prev[rail].items.filter((it) => it.id !== itemId),
        },
      }));
    },
    [commit]
  );

  const updateRailItem = React.useCallback(
    (rail: 'serviceRail' | 'quickRail', itemId: string, patch: Partial<RailItem>) => {
      const modeId = activeModeIdRef.current || 'day';
      commit((prev) => ({
        ...prev,
        [rail]: {
          ...prev[rail],
          items: prev[rail].items.map((it) => {
            if (it.id !== itemId) return it;
            return applyRailItemModePatch(it, modeId, patch);
          }),
        },
      }));
    },
    [commit]
  );

  const setRailItemImage = React.useCallback(
    async (rail: 'serviceRail' | 'quickRail', itemId: string, file: File) => {
      try {
        const prepared = await prepareDesignMediaFile(file);
        const imageId = createRailImageId();
        await putHeroImageBlob(imageId, prepared);
        const modeId = activeModeIdRef.current || 'day';
        commit((prev) => ({
          ...prev,
          [rail]: {
            ...prev[rail],
            items: prev[rail].items.map((it) => {
              if (it.id !== itemId) return it;
              return applyRailItemModePatch(it, modeId, {
                imageId,
                mediaUrl: undefined,
                mediaKind: undefined,
              });
            }),
          },
        }));
      } catch {
        /* skip failed upload */
      }
    },
    [commit]
  );

  const setRailItemMediaUrl = React.useCallback(
    (rail: 'serviceRail' | 'quickRail', itemId: string, rawUrl: string) => {
      const url = normalizeMediaUrlInput(rawUrl);
      if (!url) return false;
      const mediaKind = detectMediaKindFromUrl(url);
      const modeId = activeModeIdRef.current || 'day';
      commit((prev) => ({
        ...prev,
        [rail]: {
          ...prev[rail],
          items: prev[rail].items.map((it) => {
            if (it.id !== itemId) return it;
            return applyRailItemModePatch(it, modeId, {
              mediaUrl: url,
              mediaKind,
              imageId: undefined,
            });
          }),
        },
      }));
      return true;
    },
    [commit]
  );

  const removeRailItemImage = React.useCallback(
    (rail: 'serviceRail' | 'quickRail', itemId: string) => {
      const modeId = activeModeIdRef.current || 'day';
      commit((prev) => ({
        ...prev,
        [rail]: {
          ...prev[rail],
          items: prev[rail].items.map((it) => {
            if (it.id !== itemId) return it;
            return applyRailItemModePatch(it, modeId, {
              imageId: undefined,
              mediaUrl: undefined,
              mediaKind: undefined,
            });
          }),
        },
      }));
    },
    [commit]
  );

  const updateTypePanelItem = React.useCallback(
    (itemId: string, patch: Partial<TypePanelItem>) => {
      const modeId = activeModeIdRef.current || 'day';
      commit((prev) => ({
        ...prev,
        typePanel: {
          ...prev.typePanel,
          items: (prev.typePanel.items || []).map((it) => {
            if (it.id !== itemId) return it;
            return applyTypePanelItemModePatch(it, modeId, patch);
          }),
        },
      }));
    },
    [commit]
  );

  const setTypePanelItemImage = React.useCallback(
    async (itemId: string, file: File) => {
      try {
        const prepared = await prepareDesignMediaFile(file);
        const imageId = createRailImageId();
        await putHeroImageBlob(imageId, prepared);
        const modeId = activeModeIdRef.current || 'day';
        commit((prev) => ({
          ...prev,
          typePanel: {
            ...prev.typePanel,
            items: (prev.typePanel.items || []).map((it) => {
              if (it.id !== itemId) return it;
              return applyTypePanelItemModePatch(it, modeId, {
                imageId,
                mediaUrl: undefined,
                mediaKind: undefined,
              });
            }),
          },
        }));
      } catch {
        /* skip failed upload */
      }
    },
    [commit]
  );

  const setTypePanelItemMediaUrl = React.useCallback(
    (itemId: string, rawUrl: string) => {
      const url = normalizeMediaUrlInput(rawUrl);
      if (!url) return false;
      const mediaKind = detectMediaKindFromUrl(url);
      const modeId = activeModeIdRef.current || 'day';
      commit((prev) => ({
        ...prev,
        typePanel: {
          ...prev.typePanel,
          items: (prev.typePanel.items || []).map((it) => {
            if (it.id !== itemId) return it;
            return applyTypePanelItemModePatch(it, modeId, {
              mediaUrl: url,
              mediaKind,
              imageId: undefined,
            });
          }),
        },
      }));
      return true;
    },
    [commit]
  );

  const removeTypePanelItemImage = React.useCallback(
    (itemId: string) => {
      const modeId = activeModeIdRef.current || 'day';
      commit((prev) => ({
        ...prev,
        typePanel: {
          ...prev.typePanel,
          items: (prev.typePanel.items || []).map((it) => {
            if (it.id !== itemId) return it;
            return applyTypePanelItemModePatch(it, modeId, {
              imageId: undefined,
              mediaUrl: undefined,
              mediaKind: undefined,
            });
          }),
        },
      }));
    },
    [commit]
  );

  /** Reset box / header coordinates. Hidden and faded items stay hidden. */
  const resetLayout = React.useCallback(() => {
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            'მხოლოდ პოზიციები და ზომები ნაგულისხმევზე დაბრუნდება.\n\n' +
              'ჩამქრალი ან დამალული ელემენტები ჩამქრალი რჩება.\n' +
              'რეჟიმები, ფერები და ტექსტები არ იცვლება.\n\n' +
              'გავაგრძელოთ?'
          );
    if (!ok) return;
    pushHistory();
    const prev = layoutRef.current;
    let next = applyDefaultGeometry(prev);

    if (typeof document !== 'undefined') {
      const host = document.querySelector('[data-header-canvas]');
      if (host instanceof HTMLElement) {
        const box = host.getBoundingClientRect();
        if (box.width > 0) {
          const widthsPx: Partial<Record<HeaderItemId, number>> = {};
          host.querySelectorAll<HTMLElement>('[data-header-item]').forEach((el) => {
            const id = el.getAttribute('data-header-item') as HeaderItemId | null;
            if (!id || !HEADER_ITEM_IDS.includes(id)) return;
            widthsPx[id] = el.getBoundingClientRect().width;
          });
          const skip = new Set<HeaderItemId>([
            'messages',
            ...headerItemIdsHiddenByStyle(prev.header.itemStyles),
          ]);
          if (widthsPx.profile) skip.add('login');
          else skip.add('profile');
          if (!widthsPx.admin) skip.add('admin');
          const packed = packHeaderItemPositions({
            barW: box.width,
            widthsPx,
            skipIds: skip,
          });
          const merged = { ...packed };
          const prevPos = prev.header.itemPositions || {};
          for (const id of skip) {
            if (id === 'messages' || id === 'login') continue;
            if (prevPos[id]) merged[id] = { ...prevPos[id] };
          }
          next = {
            ...next,
            header: { ...next.header, itemPositions: merged },
          };
        }
      }
    }

    setLayout(next);
  }, [pushHistory]);

  /** სრული factory default — პოზიციები + რეჟიმები/ფერები კოდის საწყისზე */
  const resetToFactoryDefault = React.useCallback(() => {
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            'მთელი ვიზუალი დაბრუნდება კოდის ნაგულისხმევზე (პოზიციები, რეჟიმები, ფერები).\n\n' +
              'შენახული დეფაულტები (პრესეტები) არ წაიშლება.\n\n' +
              'გავაგრძელოთ?'
          );
    if (!ok) return;
    pushHistory();
    setLayout(cloneLayout(DEFAULT_HOME_DESIGN));
  }, [pushHistory]);

  const refreshDesignPresets = React.useCallback(async () => {
    if (!canDesignModeRef.current) return;
    setDesignPresetsLoading(true);
    try {
      const res = await listHomeDesignPresets();
      setDesignPresets(Array.isArray(res.presets) ? res.presets : []);
      if (typeof res.maxPresets === 'number' && res.maxPresets > 0) {
        setDesignPresetsMax(res.maxPresets);
      }
    } catch {
      /* ignore — inspector shows empty list */
    } finally {
      setDesignPresetsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!canDesignMode || !designMode) return;
    void refreshDesignPresets();
  }, [canDesignMode, designMode, refreshDesignPresets]);

  const saveCurrentAsPreset = React.useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      try {
        const res = await createHomeDesignPreset(trimmed, cloneLayout(layoutRef.current));
        setDesignPresets(Array.isArray(res.presets) ? res.presets : []);
        if (typeof res.maxPresets === 'number') setDesignPresetsMax(res.maxPresets);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'დეფაულტის შენახვა ვერ მოხერხდა';
        if (typeof window !== 'undefined') window.alert(msg);
        return false;
      }
    },
    []
  );

  const applyDesignPreset = React.useCallback(
    async (presetId: string) => {
      let preset = designPresets.find((p) => p.id === presetId);
      if (!preset?.layout) {
        try {
          const res = await listHomeDesignPresets();
          setDesignPresets(Array.isArray(res.presets) ? res.presets : []);
          preset = (res.presets || []).find((p) => p.id === presetId);
        } catch {
          if (typeof window !== 'undefined') window.alert('პრესეტების ჩატვირთვა ვერ მოხერხდა');
          return false;
        }
      }
      if (!preset?.layout) {
        if (typeof window !== 'undefined') window.alert('დეფაულტი ვერ მოიძებნა');
        return false;
      }
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              `გამოვიყენოთ დეფაულტი „${preset.name}"?\n\n` +
                'მიმდინარე ვიზუალი შეიცვლება. გამოქვეყნებისთვის დააჭირე შენახვას.'
            );
      if (!ok) return false;
      pushHistory();
      setLayout(normalizeHomeDesignInput(preset.layout as Partial<HomeDesignLayout>));
      return true;
    },
    [designPresets, pushHistory]
  );

  const overwriteDesignPreset = React.useCallback(async (presetId: string) => {
    const preset = designPresets.find((p) => p.id === presetId);
    const label = preset?.name || 'დეფაულტი';
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            `განვაახლოთ „${label}" მიმდინარე ვიზუალით?\n\nძველი ვერსია ამ პრესეტში ჩანაცვლდება.`
          );
    if (!ok) return false;
    try {
      const res = await updateHomeDesignPreset(presetId, {
        layout: cloneLayout(layoutRef.current),
      });
      setDesignPresets(Array.isArray(res.presets) ? res.presets : []);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'განახლება ვერ მოხერხდა';
      if (typeof window !== 'undefined') window.alert(msg);
      return false;
    }
  }, [designPresets]);

  const removeDesignPreset = React.useCallback(async (presetId: string) => {
    const preset = designPresets.find((p) => p.id === presetId);
    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm(`წავშალოთ დეფაულტი „${preset?.name || presetId}"?`);
    if (!ok) return false;
    try {
      const res = await deleteHomeDesignPreset(presetId);
      setDesignPresets(Array.isArray(res.presets) ? res.presets : []);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'წაშლა ვერ მოხერხდა';
      if (typeof window !== 'undefined') window.alert(msg);
      return false;
    }
  }, [designPresets]);

  const value = React.useMemo(
    () => ({
      designMode,
      canDesignMode,
      setDesignMode,
      layout,
      selectedId,
      setSelectedId,
      selectedRailItemId,
      setSelectedRailItemId,
      selectedTypeItemId,
      setSelectedTypeItemId,
      selectedSearchControlId,
      setSelectedSearchControlId,
      selectedDealChipId,
      setSelectedDealChipId,
      selectedHeaderItemId,
      setSelectedHeaderItemId,
      activeEditParams,
      setActiveEditParams,
      isDirty,
      saving,
      saveDesignChanges,
      discardDesignChanges,
      canUndo,
      canRedo,
      undo,
      redo,
      beginHistoryGesture,
      endHistoryGesture,
      updateBox,
      updateSearch,
      updateSearchControl,
      updateDealChip,
      updateHero,
      updateHeader,
      updateHeroText,
      addHeroImages,
      addHeroMediaUrl,
      removeHeroImage,
      moveHeroImage,
      toggleHeroRotationImage,
      toggleHeroModeEnabled,
      addThemeMode,
      removeThemeMode,
      updateThemeMode,
      updateThemePalette,
      resetThemePalette,
      setHeaderBgImage,
      setHeaderBgMediaUrl,
      removeHeaderBgMedia,
      setThemeToggleIconImage,
      setThemeToggleIconMediaUrl,
      removeThemeToggleIconMedia,
      updateServiceRail,
      updateQuickRail,
      updateSocialLinks,
      addRailItem,
      removeRailItem,
      updateRailItem,
      setRailItemImage,
      setRailItemMediaUrl,
      removeRailItemImage,
      updateTypePanelItem,
      setTypePanelItemImage,
      setTypePanelItemMediaUrl,
      removeTypePanelItemImage,
      resetLayout,
      resetToFactoryDefault,
      designPresets,
      designPresetsMax,
      designPresetsLoading,
      refreshDesignPresets,
      saveCurrentAsPreset,
      applyDesignPreset,
      overwriteDesignPreset,
      removeDesignPreset,
    }),
    [
      designMode,
      canDesignMode,
      setDesignMode,
      layout,
      selectedId,
      selectedRailItemId,
      selectedTypeItemId,
      selectedSearchControlId,
      selectedDealChipId,
      selectedHeaderItemId,
      activeEditParams,
      isDirty,
      saving,
      saveDesignChanges,
      discardDesignChanges,
      canUndo,
      canRedo,
      undo,
      redo,
      beginHistoryGesture,
      endHistoryGesture,
      updateBox,
      updateSearch,
      updateSearchControl,
      updateDealChip,
      updateHero,
      updateHeader,
      updateHeroText,
      addHeroImages,
      addHeroMediaUrl,
      removeHeroImage,
      moveHeroImage,
      toggleHeroRotationImage,
      toggleHeroModeEnabled,
      addThemeMode,
      removeThemeMode,
      updateThemeMode,
      updateThemePalette,
      resetThemePalette,
      setHeaderBgImage,
      setHeaderBgMediaUrl,
      removeHeaderBgMedia,
      setThemeToggleIconImage,
      setThemeToggleIconMediaUrl,
      removeThemeToggleIconMedia,
      updateServiceRail,
      updateQuickRail,
      updateSocialLinks,
      addRailItem,
      removeRailItem,
      updateRailItem,
      setRailItemImage,
      setRailItemMediaUrl,
      removeRailItemImage,
      updateTypePanelItem,
      setTypePanelItemImage,
      setTypePanelItemMediaUrl,
      removeTypePanelItemImage,
      resetLayout,
      resetToFactoryDefault,
      designPresets,
      designPresetsMax,
      designPresetsLoading,
      refreshDesignPresets,
      saveCurrentAsPreset,
      applyDesignPreset,
      overwriteDesignPreset,
      removeDesignPreset,
    ]
  );

  return <HomeDesignContext.Provider value={value}>{children}</HomeDesignContext.Provider>;
}

export function useHomeDesign() {
  const ctx = React.useContext(HomeDesignContext);
  if (!ctx) {
    throw new Error('useHomeDesign must be used within HomeDesignProvider');
  }
  return ctx;
}

/** Safe hook when provider might be absent (non-home pages) */
export function useHomeDesignOptional() {
  return React.useContext(HomeDesignContext);
}
