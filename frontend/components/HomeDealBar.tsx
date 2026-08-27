'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { DEAL_TYPES, type FiltersState } from '@/components/Filters';
import { DealChipShell } from '@/components/home-design/DealChipShell';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  type DealChipId,
  DEFAULT_DEAL_BAR,
  normalizeDealBar,
} from '@/lib/homeDesignLayout';

type HomeDealBarProps = {
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
  designMode?: boolean;
};

const DEAL_VALUE_TO_CHIP: Record<string, DealChipId> = {
  sale: 'sale',
  rent: 'rent',
  mortgage: 'mortgage',
};

/** Independent deal-type chips (იყიდება / ქირავდება / გირავდება) — outside search box */
export function HomeDealBar({ filters, onChange, designMode = false }: HomeDealBarProps) {
  const { t, ready } = useTranslation();
  const design = useHomeDesignOptional();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const dealLayout = normalizeDealBar(design?.layout.dealBar || DEFAULT_DEAL_BAR);
  const gap = dealLayout.gap ?? 8;

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
    <div
      className="flex h-full w-full flex-wrap items-center justify-center"
      style={{ gap }}
    >
      {DEAL_TYPES.map((dt) => {
        const isSelected = filters.dealType.includes(dt.value);
        const chipId = DEAL_VALUE_TO_CHIP[dt.value] || 'sale';
        const button = (
          <button
            type="button"
            onClick={() => {
              if (designMode) return;
              const newDealType = isSelected
                ? filters.dealType.filter((d) => d !== dt.value)
                : [...filters.dealType, dt.value];
              onChange({ ...filters, dealType: newDealType });
            }}
            className={`inline-flex h-full w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-medium leading-none shadow-sm transition-all max-md:min-h-10 ${
              isSelected
                ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-black'
                : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700'
            }`}
          >
            <span aria-hidden>{dt.icon}</span>
            <span>{label(dt.key, fallbacks[dt.key] || dt.value)}</span>
          </button>
        );

        return (
          <DealChipShell key={dt.value} id={chipId}>
            {button}
          </DealChipShell>
        );
      })}
    </div>
  );
}
