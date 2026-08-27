'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { formatSqmCompact } from '@/lib/propertyDisplay';

export function PropertySpecChips({
  p,
  className = '',
  gapClass = 'gap-1.5',
  compact = false,
  nowrap = false,
}: {
  p: Property;
  className?: string;
  gapClass?: string;
  /** უფრო დაბალი ჩიპები */
  compact?: boolean;
  /** ერთ ხაზზე, გადატანის გარეშე */
  nowrap?: boolean;
}) {
  const { t } = useTranslation();

  const rooms = p.rooms || p.roomCount || 0;
  const bedrooms = p.bedrooms || 0;
  const floor = p.floor || 0;
  const totalFloors = p.totalFloors || 0;
  const hasSqm = p.sqm != null && p.sqm > 0;
  const hasHouseSqm = p.houseSqm != null && p.houseSqm > 0;

  const iconClass = compact
    ? 'h-3.5 w-3.5 shrink-0 text-slate-500'
    : 'h-4 w-4 shrink-0 text-slate-500';
  const chipClass = compact
    ? 'inline-flex cursor-default items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'
    : 'inline-flex cursor-default items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:bg-zinc-800 dark:text-zinc-100';

  const chips: { key: string; label: string; value: string; icon: React.ReactNode }[] = [];

  if (hasSqm) {
    const sqmIsLand =
      hasHouseSqm || p.type === 'house' || p.type === 'cottage' || p.type === 'land';
    chips.push({
      key: 'sqm',
      label: t(sqmIsLand ? 'land_area_detail' : 'areaLabel'),
      value: `${formatSqmCompact(p.sqm!)} ${t('sqm_unit_short')}`,
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth={2} strokeLinecap="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      ),
    });
  }
  if (p.type === 'land' && p.landStatus) {
    chips.push({
      key: 'landStatus',
      label: t('land_status_label'),
      value: t(`land_status_${p.landStatus}`),
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 3c.5 2 2 4 4 5-2 1-3.5 3-4 5-.5-2-2-4-4-5 2-1 3.5-3 4-5zM5 19h14" />
        </svg>
      ),
    });
  }
  if (hasHouseSqm && p.type !== 'land') {
    chips.push({
      key: 'houseSqm',
      label: t('house_area_detail'),
      value: `${formatSqmCompact(p.houseSqm!)} ${t('sqm_unit_short')}`,
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-4v-6H8v6H4a1 1 0 01-1-1v-9.5z"
          />
        </svg>
      ),
    });
  }
  if (floor > 0) {
    chips.push({
      key: 'floor',
      label: t('floor_detail'),
      value: totalFloors > 0 ? `${floor}/${totalFloors}` : String(floor),
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth={2} strokeLinecap="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2-12h14" />
        </svg>
      ),
    });
  } else if (totalFloors > 0) {
    chips.push({
      key: 'storeys',
      label: t('storeys_detail'),
      value: String(totalFloors),
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth={2} strokeLinecap="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2-12h14" />
        </svg>
      ),
    });
  }
  if (rooms > 0) {
    chips.push({
      key: 'rooms',
      label: t('filter_room'),
      value: String(rooms),
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth={2} strokeLinecap="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    });
  }
  if (bedrooms > 0) {
    chips.push({
      key: 'bedrooms',
      label: t('bedroom_word'),
      value: String(bedrooms),
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M20 10V7a2 2 0 00-2-2H6a2 2 0 00-2 2v3m16 0v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8m16 0H4" />
        </svg>
      ),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={`flex ${nowrap ? 'flex-nowrap' : 'flex-wrap'} ${gapClass} ${className}`}>
      {chips.map((chip) => (
        <div key={chip.key} className={chipClass} title={chip.label}>
          {chip.icon}
          <span>{chip.value}</span>
        </div>
      ))}
    </div>
  );
}
