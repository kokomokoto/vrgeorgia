'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { HOME_DESIGN_STORAGE_KEY } from '@/lib/homeDesignLayout';
import { HOME_DESIGN_THEME_MODES_EVENT } from '@/components/home-design/HomeDesignContext';
import {
  baseToneFromBuiltinId,
  builtinIdFromBaseTone,
  createDefaultThemeModes,
  getEnabledThemeModes,
  isBuiltinThemeModeId,
  isThemeBaseTone,
  resolveActiveThemeMode,
  type ThemeBaseTone,
  type ThemeModeDef,
} from '@/lib/themeModes';

const STORAGE_KEY = 'vr-theme';
const MODE_ID_KEY = 'vr-theme-mode-id';

/** DOM / CSS theme class tone */
export type ThemeMode = ThemeBaseTone;

export const THEME_CYCLE: ThemeMode[] = ['light', 'twilight', 'dark'];

export type ThemeModeInfo = {
  id: string;
  label: string;
  baseTone: ThemeMode;
};

function themeModeInfosFromLayout(parsed: unknown): ThemeModeInfo[] {
  const layout = parsed as {
    themeModes?: ThemeModeDef[];
    hero?: { enabledModes?: unknown };
  } | null;

  if (Array.isArray(layout?.themeModes) && layout.themeModes.length > 0) {
    const enabled = getEnabledThemeModes(layout.themeModes);
    return enabled.map((m) => ({
      id: m.id,
      label: m.label,
      baseTone: m.baseTone,
    }));
  }

  const source = Array.isArray(layout?.hero?.enabledModes)
    ? layout!.hero!.enabledModes
    : ['day', 'twilight', 'night'];
  const mapped = source
    .map((mode) => {
      if (!isBuiltinThemeModeId(String(mode))) return null;
      const id = String(mode);
      const baseTone = baseToneFromBuiltinId(id as 'day' | 'twilight' | 'night');
      const defaults = createDefaultThemeModes();
      const def = defaults.find((m) => m.id === id);
      return {
        id,
        label: def?.label || id,
        baseTone,
      } satisfies ThemeModeInfo;
    })
    .filter((m): m is ThemeModeInfo => m !== null);

  return mapped.length > 0
    ? mapped
    : createDefaultThemeModes().map((m) => ({
        id: m.id,
        label: m.label,
        baseTone: m.baseTone,
      }));
}

export function nextTheme(mode: ThemeMode, enabledModes: ThemeMode[] = THEME_CYCLE): ThemeMode {
  const cycle = enabledModes.length > 0 ? enabledModes : THEME_CYCLE;
  const i = cycle.indexOf(mode);
  if (i < 0) return cycle[0];
  return cycle[(i + 1) % cycle.length];
}

function isThemeMode(value: string | null): value is ThemeMode {
  return isThemeBaseTone(value);
}

type ThemeContextValue = {
  theme: ThemeMode;
  activeModeId: string;
  setTheme: (t: ThemeMode) => void;
  setActiveModeId: (id: string) => void;
  toggle: () => void;
  /** Enabled mode definitions (for cycling / labels) */
  modeInfos: ThemeModeInfo[];
  /** Unique base tones currently enabled (legacy helpers) */
  enabledModes: ThemeMode[];
  isDark: boolean;
  isTwilight: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDomTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('twilight', mode === 'twilight');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [activeModeId, setActiveModeIdState] = useState<string>('day');
  const [modeInfos, setModeInfos] = useState<ThemeModeInfo[]>(() =>
    createDefaultThemeModes().map((m) => ({
      id: m.id,
      label: m.label,
      baseTone: m.baseTone,
    }))
  );

  const applyMode = useCallback((info: ThemeModeInfo) => {
    setActiveModeIdState(info.id);
    setThemeState(info.baseTone);
    try {
      localStorage.setItem(STORAGE_KEY, info.baseTone);
      localStorage.setItem(MODE_ID_KEY, info.id);
    } catch {
      /* ignore */
    }
    applyDomTheme(info.baseTone);
  }, []);

  const syncFromInfos = useCallback(
    (infos: ThemeModeInfo[], preferredId?: string | null) => {
      const list = infos.length > 0 ? infos : themeModeInfosFromLayout(null);
      setModeInfos(list);
      setActiveModeIdState((prev) => {
        const preferred = preferredId || prev;
        const match =
          list.find((m) => m.id === preferred) ||
          list.find((m) => m.baseTone === theme) ||
          list[0];
        if (!match) return prev;
        if (match.id !== prev || match.baseTone !== theme) {
          try {
            localStorage.setItem(STORAGE_KEY, match.baseTone);
            localStorage.setItem(MODE_ID_KEY, match.id);
          } catch {
            /* ignore */
          }
          applyDomTheme(match.baseTone);
          setThemeState(match.baseTone);
        }
        return match.id;
      });
    },
    [theme]
  );

  React.useEffect(() => {
    try {
      const rawLayout = localStorage.getItem(HOME_DESIGN_STORAGE_KEY);
      const parsed = rawLayout ? JSON.parse(rawLayout) : null;
      const infos = themeModeInfosFromLayout(parsed);
      setModeInfos(infos);

      const storedId = localStorage.getItem(MODE_ID_KEY);
      const storedTone = localStorage.getItem(STORAGE_KEY);
      const byId = storedId ? infos.find((m) => m.id === storedId) : undefined;
      if (byId) {
        applyMode(byId);
        return;
      }
      if (isThemeMode(storedTone)) {
        const byTone = infos.find((m) => m.baseTone === storedTone);
        applyMode(byTone || infos[0]);
        return;
      }
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      const initialTone: ThemeMode = prefersDark ? 'dark' : 'light';
      const byTone = infos.find((m) => m.baseTone === initialTone);
      applyMode(byTone || infos[0]);
    } catch {
      applyDomTheme('light');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyMode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== HOME_DESIGN_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        syncFromInfos(themeModeInfosFromLayout(parsed));
      } catch {
        /* ignore */
      }
    };
    const handleDesignEvent = (event: Event) => {
      const custom = event as CustomEvent<{
        modeInfos?: ThemeModeInfo[];
        enabledModes?: Array<'day' | 'twilight' | 'night'>;
        themeModes?: ThemeModeDef[];
      }>;
      if (Array.isArray(custom.detail?.modeInfos) && custom.detail.modeInfos.length > 0) {
        syncFromInfos(custom.detail.modeInfos);
        return;
      }
      if (Array.isArray(custom.detail?.themeModes)) {
        syncFromInfos(themeModeInfosFromLayout({ themeModes: custom.detail.themeModes }));
        return;
      }
      syncFromInfos(
        themeModeInfosFromLayout({
          hero: { enabledModes: custom.detail?.enabledModes },
        })
      );
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(HOME_DESIGN_THEME_MODES_EVENT, handleDesignEvent as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(HOME_DESIGN_THEME_MODES_EVENT, handleDesignEvent as EventListener);
    };
  }, [syncFromInfos]);

  const setTheme = useCallback(
    (t: ThemeMode) => {
      const match = modeInfos.find((m) => m.baseTone === t) || modeInfos[0];
      if (match) applyMode(match);
      else {
        applyDomTheme(t);
        setThemeState(t);
      }
    },
    [applyMode, modeInfos]
  );

  const setActiveModeId = useCallback(
    (id: string) => {
      const match = modeInfos.find((m) => m.id === id);
      if (match) applyMode(match);
    },
    [applyMode, modeInfos]
  );

  const toggle = useCallback(() => {
    setActiveModeIdState((prev) => {
      if (modeInfos.length === 0) return prev;
      const i = modeInfos.findIndex((m) => m.id === prev);
      const next = modeInfos[(i < 0 ? 0 : i + 1) % modeInfos.length];
      try {
        localStorage.setItem(STORAGE_KEY, next.baseTone);
        localStorage.setItem(MODE_ID_KEY, next.id);
      } catch {
        /* ignore */
      }
      applyDomTheme(next.baseTone);
      setThemeState(next.baseTone);
      return next.id;
    });
  }, [modeInfos]);

  const enabledModes = useMemo(() => {
    const tones = Array.from(new Set(modeInfos.map((m) => m.baseTone)));
    return tones.length > 0 ? tones : THEME_CYCLE;
  }, [modeInfos]);

  const value = useMemo(
    () => ({
      theme,
      activeModeId,
      setTheme,
      setActiveModeId,
      toggle,
      modeInfos,
      enabledModes,
      isDark: theme === 'dark',
      isTwilight: theme === 'twilight',
    }),
    [theme, activeModeId, setTheme, setActiveModeId, toggle, modeInfos, enabledModes]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Helpers used by Design Mode preview buttons */
export function heroModeToTheme(mode: 'day' | 'twilight' | 'night'): ThemeMode {
  return baseToneFromBuiltinId(mode);
}

export function themeClassFromModeId(
  modeId: string,
  modes: ThemeModeDef[]
): ThemeMode {
  const found = resolveActiveThemeMode(modes, modeId);
  return found.baseTone;
}

export { builtinIdFromBaseTone };
