'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { HOME_DESIGN_STORAGE_KEY } from '@/lib/homeDesignLayout';
import { HOME_DESIGN_THEME_MODES_EVENT } from '@/components/home-design/HomeDesignContext';

const STORAGE_KEY = 'vr-theme';

export type ThemeMode = 'light' | 'twilight' | 'dark';

export const THEME_CYCLE: ThemeMode[] = ['light', 'twilight', 'dark'];

type HeroMode = 'day' | 'twilight' | 'night';

function heroModeToTheme(mode: HeroMode): ThemeMode {
  if (mode === 'day') return 'light';
  if (mode === 'night') return 'dark';
  return 'twilight';
}

function normalizeEnabledThemes(modes?: unknown): ThemeMode[] {
  const source = Array.isArray(modes) ? modes : ['day', 'twilight', 'night'];
  const mapped = source
    .map((mode) =>
      mode === 'day' || mode === 'twilight' || mode === 'night' ? heroModeToTheme(mode) : null
    )
    .filter((mode): mode is ThemeMode => mode !== null);
  return mapped.length > 0 ? mapped : THEME_CYCLE;
}

export function nextTheme(mode: ThemeMode, enabledModes: ThemeMode[] = THEME_CYCLE): ThemeMode {
  const cycle = enabledModes.length > 0 ? enabledModes : THEME_CYCLE;
  const i = cycle.indexOf(mode);
  if (i < 0) return cycle[0];
  return cycle[(i + 1) % cycle.length];
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'twilight' || value === 'dark';
}

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggle: () => void;
  enabledModes: ThemeMode[];
  /** HTML-ზე ``dark`` კლასი თუ ჩართულია */
  isDark: boolean;
  /** შუალედური (ბინდის) რეჟიმი */
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
  const [enabledModes, setEnabledModes] = useState<ThemeMode[]>(THEME_CYCLE);

  const applyThemeAndPersist = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    applyDomTheme(mode);
  }, []);

  React.useEffect(() => {
    try {
      const rawLayout = localStorage.getItem(HOME_DESIGN_STORAGE_KEY);
      if (rawLayout) {
        const parsed = JSON.parse(rawLayout);
        setEnabledModes(normalizeEnabledThemes(parsed?.hero?.enabledModes));
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isThemeMode(stored)) {
        const normalized = normalizeEnabledThemes(
          rawLayout ? JSON.parse(rawLayout)?.hero?.enabledModes : undefined
        );
        const next = normalized.includes(stored) ? stored : normalized[0];
        applyThemeAndPersist(next);
        return;
      }
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      const initial = prefersDark ? 'dark' : 'light';
      const rawEnabled = rawLayout ? JSON.parse(rawLayout)?.hero?.enabledModes : undefined;
      const normalized = normalizeEnabledThemes(rawEnabled);
      const next = normalized.includes(initial) ? initial : normalized[0];
      applyThemeAndPersist(next);
    } catch {
      applyDomTheme('light');
    }
  }, [applyThemeAndPersist]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncEnabledModes = (detailModes?: unknown) => {
      const normalized = normalizeEnabledThemes(detailModes);
      setEnabledModes(normalized);
      setThemeState((prev) => {
        const next = normalized.includes(prev) ? prev : normalized[0];
        if (next !== prev) {
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            /* ignore */
          }
          applyDomTheme(next);
        }
        return next;
      });
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== HOME_DESIGN_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        syncEnabledModes(parsed?.hero?.enabledModes);
      } catch {
        /* ignore */
      }
    };
    const handleDesignEvent = (event: Event) => {
      const custom = event as CustomEvent<{ enabledModes?: HeroMode[] }>;
      syncEnabledModes(custom.detail?.enabledModes);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(HOME_DESIGN_THEME_MODES_EVENT, handleDesignEvent as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(HOME_DESIGN_THEME_MODES_EVENT, handleDesignEvent as EventListener);
    };
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    applyThemeAndPersist(enabledModes.includes(t) ? t : enabledModes[0]);
  }, [applyThemeAndPersist, enabledModes]);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = nextTheme(prev, enabledModes);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyDomTheme(next);
      return next;
    });
  }, [enabledModes]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggle,
      enabledModes,
      isDark: theme === 'dark',
      isTwilight: theme === 'twilight',
    }),
    [theme, setTheme, toggle, enabledModes]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
