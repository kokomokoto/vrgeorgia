'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { nextTheme, useTheme, type ThemeMode } from './ThemeProvider';

function nextThemeLabelKey(
  mode: ThemeMode,
  enabledModes: ThemeMode[]
): 'theme_light' | 'theme_twilight' | 'theme_dark' {
  const next = nextTheme(mode, enabledModes);
  if (next === 'light') return 'theme_light';
  if (next === 'twilight') return 'theme_twilight';
  return 'theme_dark';
}

function nextThemeIcon(mode: ThemeMode, enabledModes: ThemeMode[]) {
  const next = nextTheme(mode, enabledModes);
  if (next === 'light') return '☀️';
  if (next === 'twilight') return '🌅';
  return '🌙';
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle, enabledModes } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  /** SSR და პირველი client რენდერი იგივეა — theme/i18n მხოლოდ mount-ის შემდეგ */
  const label = !mounted ? 'Twilight mode' : t(nextThemeLabelKey(theme, enabledModes));
  const icon = !mounted ? '🌅' : nextThemeIcon(theme, enabledModes);
  const disabled = enabledModes.length < 2;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-amber-400 dark:hover:bg-zinc-700 twilight:border-orange-200/80 twilight:bg-orange-50/90 twilight:text-orange-800 twilight:hover:bg-orange-100/90"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
