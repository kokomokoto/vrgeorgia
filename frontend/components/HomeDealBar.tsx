'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { DEAL_TYPES, type FiltersState } from '@/components/Filters';

type HomeDealBarProps = {
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
  designMode?: boolean;
};

/** Independent deal-type chips (იყიდება / ქირავდება / გირავდება) — outside search box */
export function HomeDealBar({ filters, onChange, designMode = false }: HomeDealBarProps) {
  const { t, ready } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const label = (key: string, fallback: string) => {
    if (!mounted || !ready) return fallback;
    const v = t(key);
    return !v || v === key ? fallback : v;
  };

  const fallbacks: Record<string, string> = {
    deal_sale: 'იყიდება',
    deal_rent: 'ქირავდება',
    deal_mortgage: 'გირავდება',
  };

  return (
    <div className="flex h-full w-full flex-wrap items-center gap-2">
      {DEAL_TYPES.map((dt) => {
        const isSelected = filters.dealType.includes(dt.value);
        return (
          <button
            key={dt.value}
            type="button"
            onClick={() => {
              if (designMode) return;
              const newDealType = isSelected
                ? filters.dealType.filter((d) => d !== dt.value)
                : [...filters.dealType, dt.value];
              onChange({ ...filters, dealType: newDealType });
            }}
            className={`inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium leading-none shadow-sm transition-all sm:px-4 ${
              isSelected
                ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-black'
                : 'bg-white/95 text-slate-800 hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-100'
            }`}
          >
            <span aria-hidden>{dt.icon}</span>
            <span>{label(dt.key, fallbacks[dt.key] || dt.value)}</span>
          </button>
        );
      })}
    </div>
  );
}
