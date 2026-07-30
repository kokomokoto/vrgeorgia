'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiLang } from '@/lib/apiLang';

const langs = [
  { code: 'ka', label: 'KA' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' }
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  // სერვერზე ენა ყოველთვის ნაგულისხმევია, კლიენტზე კი შენახულიდან ამოდის —
  // პირველ რენდერზე იმავე მნიშვნელობას ვაჩვენებთ, რომ hydration არ დაირღვეს.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const current = mounted ? apiLang(i18n.language) : langs[0].code;

  return (
    <select
      suppressHydrationWarning
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      value={current}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      aria-label="Language"
    >
      {langs.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
