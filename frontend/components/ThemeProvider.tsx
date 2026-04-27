'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'vr-theme';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggle: () => void;
  /** HTML-ზე ``dark`` კლასი თუ ჩართულია */
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDomTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'dark' || stored === 'light') {
        setThemeState(stored);
        applyDomTheme(stored);
        return;
      }
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      const initial = prefersDark ? 'dark' : 'light';
      setThemeState(initial);
      applyDomTheme(initial);
    } catch {
      applyDomTheme('light');
    }
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    applyDomTheme(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyDomTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggle,
      isDark: theme === 'dark',
    }),
    [theme, setTheme, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
