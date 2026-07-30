'use client';

import React from 'react';
import {
  DEFAULT_HOME_DESIGN,
  HOME_DESIGN_STORAGE_KEY,
  createHeroImageId,
  createRailImageId,
  createRailItem,
  type DesignableId,
  type HeroLayout,
  type HeaderLayout,
  type HeroTextLayout,
  type HomeDesignLayout,
  type RailItem,
  type ThemeModeId,
  type ThemePalette,
  loadHomeDesign,
  saveHomeDesign,
} from '@/lib/homeDesignLayout';
import { DEFAULT_THEME_PALETTES, normalizeThemePalette } from '@/lib/themePalettes';
import {
  MAX_HERO_IMAGES_PER_MODE,
  deleteHeroImageBlob,
  putHeroImageBlob,
} from '@/lib/heroImageStorage';
import { compressPhotoForUpload } from '@/lib/clientPhotoCompress';

const MAX_HISTORY = 60;
export const HOME_DESIGN_THEME_MODES_EVENT = 'home-design-theme-modes';

function cloneLayout(layout: HomeDesignLayout): HomeDesignLayout {
  return JSON.parse(JSON.stringify(layout)) as HomeDesignLayout;
}

function layoutsEqual(a: HomeDesignLayout, b: HomeDesignLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function allHeroIds(layout: HomeDesignLayout): string[] {
  return [
    ...layout.hero.dayImageIds,
    ...layout.hero.twilightImageIds,
    ...layout.hero.nightImageIds,
  ];
}

function allRailImageIds(layout: HomeDesignLayout): string[] {
  const ids: string[] = [];
  for (const item of layout.serviceRail.items) {
    if (item.imageId) ids.push(item.imageId);
  }
  for (const item of layout.quickRail.items) {
    if (item.imageId) ids.push(item.imageId);
  }
  return ids;
}

function allDesignImageIds(layout: HomeDesignLayout): string[] {
  return [...allHeroIds(layout), ...allRailImageIds(layout)];
}

type HeroGalleryMode = 'day' | 'twilight' | 'night';

function heroKeys(mode: HeroGalleryMode) {
  if (mode === 'day') {
    return { images: 'dayImageIds', rotation: 'dayRotationIds' } as const;
  }
  if (mode === 'twilight') {
    return { images: 'twilightImageIds', rotation: 'twilightRotationIds' } as const;
  }
  return { images: 'nightImageIds', rotation: 'nightRotationIds' } as const;
}

type HomeDesignContextValue = {
  designMode: boolean;
  setDesignMode: (on: boolean) => void;
  layout: HomeDesignLayout;
  selectedId: DesignableId | null;
  setSelectedId: (id: DesignableId | null) => void;
  /** When a rail circle/card is clicked in Design Mode */
  selectedRailItemId: string | null;
  setSelectedRailItemId: (id: string | null) => void;
  /** Working copy differs from last saved layout */
  isDirty: boolean;
  /** Persist working layout to localStorage */
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
    id: 'heroText' | 'search' | 'map',
    patch: Partial<HomeDesignLayout['search']>
  ) => void;
  updateHero: (patch: Partial<HeroLayout>) => void;
  updateHeader: (patch: Partial<HeaderLayout>) => void;
  updateHeroText: (patch: Partial<HeroTextLayout>) => void;
  addHeroImages: (mode: HeroGalleryMode, files: File[]) => Promise<void>;
  removeHeroImage: (mode: HeroGalleryMode, imageId: string) => Promise<void>;
  moveHeroImage: (mode: HeroGalleryMode, imageId: string, dir: -1 | 1) => void;
  toggleHeroRotationImage: (mode: HeroGalleryMode, imageId: string) => void;
  toggleHeroModeEnabled: (mode: HeroGalleryMode) => void;
  updateThemePalette: (mode: ThemeModeId, patch: Partial<ThemePalette>) => void;
  resetThemePalette: (mode: ThemeModeId) => void;
  updateServiceRail: (patch: Partial<HomeDesignLayout['serviceRail']>) => void;
  updateQuickRail: (patch: Partial<HomeDesignLayout['quickRail']>) => void;
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
  removeRailItemImage: (rail: 'serviceRail' | 'quickRail', itemId: string) => void;
  resetLayout: () => void;
};

const HomeDesignContext = React.createContext<HomeDesignContextValue | null>(null);

export function HomeDesignProvider({ children }: { children: React.ReactNode }) {
  const [designMode, setDesignModeState] = React.useState(false);
  const [layout, setLayout] = React.useState<HomeDesignLayout>(DEFAULT_HOME_DESIGN);
  const [savedLayout, setSavedLayout] = React.useState<HomeDesignLayout>(DEFAULT_HOME_DESIGN);
  const [selectedId, setSelectedIdState] = React.useState<DesignableId | null>(null);
  const [selectedRailItemId, setSelectedRailItemId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  const setSelectedId = React.useCallback((id: DesignableId | null) => {
    setSelectedIdState(id);
    if (id !== 'serviceRail' && id !== 'quickRail') {
      setSelectedRailItemId(null);
    }
  }, []);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

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

  React.useEffect(() => {
    const loaded = loadHomeDesign();
    setLayout(loaded);
    setSavedLayout(cloneLayout(loaded));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(HOME_DESIGN_THEME_MODES_EVENT, {
        detail: { enabledModes: layout.hero.enabledModes, storageKey: HOME_DESIGN_STORAGE_KEY },
      })
    );
  }, [hydrated, layout.hero.enabledModes]);

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
      const working = cloneLayout(layoutRef.current);
      const previous = savedLayoutRef.current;
      // Delete blobs removed since last save
      await purgeOrphanHeroBlobs(working, previous);
      saveHomeDesign(working);
      setSavedLayout(working);
      setLayout(working);
      clearHistory();
    } finally {
      setSaving(false);
    }
  }, [clearHistory, purgeOrphanHeroBlobs, saving]);

  const setDesignMode = React.useCallback(
    (on: boolean) => {
      if (on) {
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
    (id: 'heroText' | 'search' | 'map', patch: Partial<HomeDesignLayout['search']>) => {
      commit((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...patch,
        },
      }));
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
              ? Math.max(160, Math.min(900, Math.round(patch.h)))
              : prev.hero.h,
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
        },
      }));
    },
    [commit]
  );

  const updateHeader = React.useCallback(
    (patch: Partial<HeaderLayout>) => {
      commit((prev) => ({
        ...prev,
        header: {
          ...prev.header,
          ...patch,
          h:
            patch.h !== undefined
              ? Math.max(44, Math.min(120, Math.round(patch.h)))
              : prev.header.h,
          brandFontSize:
            patch.brandFontSize !== undefined
              ? Math.max(12, Math.min(40, Math.round(patch.brandFontSize)))
              : prev.header.brandFontSize,
          navFontSize:
            patch.navFontSize !== undefined
              ? Math.max(10, Math.min(24, Math.round(patch.navFontSize)))
              : prev.header.navFontSize,
        },
      }));
    },
    [commit]
  );

  const addHeroImages = React.useCallback(
    async (mode: HeroGalleryMode, files: File[]) => {
      if (!files.length) return;
      const key = heroKeys(mode);
      const current = layoutRef.current.hero[key.images];
      const room = Math.max(0, MAX_HERO_IMAGES_PER_MODE - current.length);
      if (room <= 0) return;

      const slice = files.slice(0, room);
      const addedIds: string[] = [];

      for (const file of slice) {
        try {
          const compressed = await compressPhotoForUpload(file, false);
          const id = createHeroImageId();
          await putHeroImageBlob(id, compressed);
          addedIds.push(id);
        } catch {
          /* skip failed file */
        }
      }

      if (addedIds.length === 0) return;

      commit((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          [key.images]: [...prev.hero[key.images], ...addedIds].slice(0, MAX_HERO_IMAGES_PER_MODE),
          [key.rotation]: [...prev.hero[key.rotation], ...addedIds].slice(0, MAX_HERO_IMAGES_PER_MODE),
        },
      }));
    },
    [commit]
  );

  const removeHeroImage = React.useCallback(
    async (mode: HeroGalleryMode, imageId: string) => {
      const key = heroKeys(mode);
      // Defer IndexedDB delete until Save (or purge on Discard if it was a new upload)
      commit((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          [key.images]: prev.hero[key.images].filter((id: string) => id !== imageId),
          [key.rotation]: prev.hero[key.rotation].filter((id: string) => id !== imageId),
        },
      }));
    },
    [commit]
  );

  const moveHeroImage = React.useCallback(
    (mode: HeroGalleryMode, imageId: string, dir: -1 | 1) => {
      const key = heroKeys(mode);
      commit((prev) => {
        const list = [...prev.hero[key.images]];
        const i = list.indexOf(imageId);
        if (i < 0) return prev;
        const j = i + dir;
        if (j < 0 || j >= list.length) return prev;
        const tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
        const rotationSet = new Set(prev.hero[key.rotation]);
        const orderedRotation = list.filter((id: string) => rotationSet.has(id));
        return {
          ...prev,
          hero: {
            ...prev.hero,
            [key.images]: list,
            [key.rotation]: orderedRotation,
          },
        };
      });
    },
    [commit]
  );

  const toggleHeroRotationImage = React.useCallback(
    (mode: HeroGalleryMode, imageId: string) => {
      const key = heroKeys(mode);
      commit((prev) => {
        const selected = new Set(prev.hero[key.rotation]);
        if (selected.has(imageId)) selected.delete(imageId);
        else selected.add(imageId);
        const ordered = prev.hero[key.images].filter((id: string) => selected.has(id));
        return {
          ...prev,
          hero: {
            ...prev.hero,
            [key.rotation]: ordered,
          },
        };
      });
    },
    [commit]
  );

  const toggleHeroModeEnabled = React.useCallback(
    (mode: HeroGalleryMode) => {
      commit((prev) => {
        const enabled = new Set(prev.hero.enabledModes);
        if (enabled.has(mode)) {
          if (enabled.size === 1) return prev;
          enabled.delete(mode);
        } else {
          enabled.add(mode);
        }
        const ordered = (['day', 'twilight', 'night'] as HeroGalleryMode[]).filter((item) =>
          enabled.has(item)
        );
        return {
          ...prev,
          hero: {
            ...prev.hero,
            enabledModes: ordered,
          },
        };
      });
    },
    [commit]
  );

  const updateThemePalette = React.useCallback(
    (mode: ThemeModeId, patch: Partial<ThemePalette>) => {
      commit((prev) => ({
        ...prev,
        themePalettes: {
          ...prev.themePalettes,
          [mode]: normalizeThemePalette(
            { ...prev.themePalettes[mode], ...patch },
            DEFAULT_THEME_PALETTES[mode]
          ),
        },
      }));
    },
    [commit]
  );

  const resetThemePalette = React.useCallback(
    (mode: ThemeModeId) => {
      commit((prev) => ({
        ...prev,
        themePalettes: {
          ...prev.themePalettes,
          [mode]: { ...DEFAULT_THEME_PALETTES[mode] },
        },
      }));
    },
    [commit]
  );

  const updateServiceRail = React.useCallback(
    (patch: Partial<HomeDesignLayout['serviceRail']>) => {
      commit((prev) => ({
        ...prev,
        serviceRail: { ...prev.serviceRail, ...patch },
      }));
    },
    [commit]
  );

  const updateQuickRail = React.useCallback(
    (patch: Partial<HomeDesignLayout['quickRail']>) => {
      commit((prev) => ({
        ...prev,
        quickRail: { ...prev.quickRail, ...patch },
      }));
    },
    [commit]
  );

  const addRailItem = React.useCallback(
    (rail: 'serviceRail' | 'quickRail') => {
      commit((prev) => {
        const prefix = rail === 'serviceRail' ? 'svc' : 'quick';
        const item = createRailItem(prefix, {
          label: rail === 'serviceRail' ? 'ახალი სერვისი' : 'ახალი ბმული',
          hint: rail === 'quickRail' ? 'აღწერა' : undefined,
          href: '#',
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
      commit((prev) => ({
        ...prev,
        [rail]: {
          ...prev[rail],
          items: prev[rail].items.map((it) => {
            if (it.id !== itemId) return it;
            const next = { ...it, ...patch };
            if ('labelColor' in patch && patch.labelColor === undefined) delete next.labelColor;
            if ('hintColor' in patch && patch.hintColor === undefined) delete next.hintColor;
            return next;
          }),
        },
      }));
    },
    [commit]
  );

  const setRailItemImage = React.useCallback(
    async (rail: 'serviceRail' | 'quickRail', itemId: string, file: File) => {
      try {
        const compressed = await compressPhotoForUpload(file, false);
        const imageId = createRailImageId();
        await putHeroImageBlob(imageId, compressed);
        commit((prev) => ({
          ...prev,
          [rail]: {
            ...prev[rail],
            items: prev[rail].items.map((it) =>
              it.id === itemId ? { ...it, imageId } : it
            ),
          },
        }));
      } catch {
        /* skip failed upload */
      }
    },
    [commit]
  );

  const removeRailItemImage = React.useCallback(
    (rail: 'serviceRail' | 'quickRail', itemId: string) => {
      commit((prev) => ({
        ...prev,
        [rail]: {
          ...prev[rail],
          items: prev[rail].items.map((it) => {
            if (it.id !== itemId) return it;
            const next = { ...it };
            delete next.imageId;
            return next;
          }),
        },
      }));
    },
    [commit]
  );

  /** Reset working copy to defaults — still needs Save to persist */
  const resetLayout = React.useCallback(() => {
    pushHistory();
    setLayout(cloneLayout(DEFAULT_HOME_DESIGN));
  }, [pushHistory]);

  const value = React.useMemo(
    () => ({
      designMode,
      setDesignMode,
      layout,
      selectedId,
      setSelectedId,
      selectedRailItemId,
      setSelectedRailItemId,
      isDirty,
      saveDesignChanges,
      discardDesignChanges,
      canUndo,
      canRedo,
      undo,
      redo,
      beginHistoryGesture,
      endHistoryGesture,
      updateBox,
      updateHero,
      updateHeader,
      updateHeroText,
      addHeroImages,
      removeHeroImage,
      moveHeroImage,
      toggleHeroRotationImage,
      toggleHeroModeEnabled,
      updateThemePalette,
      resetThemePalette,
      updateServiceRail,
      updateQuickRail,
      addRailItem,
      removeRailItem,
      updateRailItem,
      setRailItemImage,
      removeRailItemImage,
      resetLayout,
    }),
    [
      designMode,
      setDesignMode,
      layout,
      selectedId,
      selectedRailItemId,
      isDirty,
      saveDesignChanges,
      discardDesignChanges,
      canUndo,
      canRedo,
      undo,
      redo,
      beginHistoryGesture,
      endHistoryGesture,
      updateBox,
      updateHero,
      updateHeader,
      updateHeroText,
      addHeroImages,
      removeHeroImage,
      moveHeroImage,
      toggleHeroRotationImage,
      toggleHeroModeEnabled,
      updateThemePalette,
      resetThemePalette,
      updateServiceRail,
      updateQuickRail,
      addRailItem,
      removeRailItem,
      updateRailItem,
      setRailItemImage,
      removeRailItemImage,
      resetLayout,
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
