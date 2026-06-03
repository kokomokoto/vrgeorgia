'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FiltersState } from '@/components/Filters';
import { parseSearchInputValue, searchInputDisplayValue } from '@/lib/searchInput';

type Props = {
  filters: FiltersState;
  onFiltersChange: (next: FiltersState) => void;
  className?: string;
};

export function MapOverlaySearch({ filters, onFiltersChange, className = '' }: Props) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const placeholder = mounted
    ? t('search_placeholder')
    : 'სათაური, ID, ტელეფონი, აგენტის სახელი...';

  const display = searchInputDisplayValue(filters);

  return (
    <div
      className={`relative w-full min-w-[12rem] max-w-[min(100%,22rem)] ${className}`.trim()}
    >
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        value={display}
        onChange={(e) => {
          const patch = parseSearchInputValue(e.target.value);
          onFiltersChange({ ...filters, ...patch });
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white/95 py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-md ring-1 ring-slate-200/80 backdrop-blur-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
        aria-label={mounted ? t('search') : 'ძიება'}
      />
      {display ? (
        <button
          type="button"
          onClick={() => onFiltersChange({ ...filters, q: '', propertyId: '' })}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label={mounted ? t('clear_filters') : 'გასუფთავება'}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
