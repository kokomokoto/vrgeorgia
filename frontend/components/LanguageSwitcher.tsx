'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiLang } from '@/lib/apiLang';
import { changeAppLanguage } from '@/lib/i18n';
import { localizePath, normalizeSiteLang, writeLangCookie } from '@/lib/siteLang';

const langs = [
  { code: 'ka', label: 'KA', name: 'ქართული' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
];

export function LanguageSwitcher() {
  return (
    <React.Suspense fallback={<LanguageSwitcherFallback />}>
      <LanguageSwitcherInner />
    </React.Suspense>
  );
}

function LanguageSwitcherFallback() {
  return (
    <select
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      defaultValue="ka"
      aria-label="Language / ენა / Язык"
      tabIndex={-1}
    >
      <option value="ka">KA</option>
    </select>
  );
}

function LanguageSwitcherInner() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  // Server and first client render share the same language (Providers), so no
  // mounted-guard is needed; keep a tiny guard for legacy localStorage migration.
  const current = apiLang(i18n.language);

  const onChange = async (value: string) => {
    const lang = normalizeSiteLang(value) ?? 'ka';
    writeLangCookie(lang);
    await changeAppLanguage(lang);
    // Keep URL and language in sync: /en/… ↔ /… ↔ /ru/…
    const nextPath = localizePath(pathname, lang);
    const query = searchParams?.toString();
    const target = query ? `${nextPath}?${query}` : nextPath;
    const currentUrl = query ? `${pathname}?${query}` : pathname;
    if (target !== currentUrl) router.replace(target, { scroll: false });
  };

  return (
    <select
      suppressHydrationWarning
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      value={current}
      onChange={(e) => void onChange(e.target.value)}
      aria-label="Language / ენა / Язык"
    >
      {langs.map((l) => (
        <option key={l.code} value={l.code} lang={l.code} aria-label={l.name}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
