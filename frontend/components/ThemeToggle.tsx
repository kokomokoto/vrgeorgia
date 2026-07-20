'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  /** SSR და პირველი client რენდერი იგივეა — theme/i18n მხოლოდ mount-ის შემდეგ */
  const label = !mounted
    ? 'Night mode'
    : theme === 'dark'
      ? t('theme_light')
      : t('theme_dark');

  const isDark = mounted && theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-amber-400 dark:hover:bg-zinc-700"
    >
      {isDark ? (
        <span aria-hidden="true">☀️</span>
      ) : (
        <span aria-hidden="true">🌙</span>
      )}
    </button>
  );
}
