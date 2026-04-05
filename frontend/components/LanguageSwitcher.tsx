'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'ka', label: 'KA' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' }
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
      value={i18n.language}
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
