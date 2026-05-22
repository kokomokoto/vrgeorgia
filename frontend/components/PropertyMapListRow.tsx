'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import CompareButton from './CompareButton';
import FavoriteButton from './FavoriteButton';

type Props = {
  p: Property;
  selected?: boolean;
  onSelect?: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
};

export function PropertyMapListRow({ p, selected, onSelect, rowRef }: Props) {
  const { t } = useTranslation();
  const mainPhotoIndex = p.mainPhoto ?? 0;
  const img = p.photos?.[mainPhotoIndex] || p.photos?.[0];
  const currencySymbol = p.priceCurrency === 'GEL' ? '₾' : '$';
  const priceLabel = p.priceType === 'per_sqm' ? t('per_sqm_suffix') : '';

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`flex gap-3 rounded-lg border p-2 text-left transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400/40 dark:border-amber-500 dark:bg-amber-950/40 dark:ring-amber-500/30'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
      }`}
    >
      <Link href={`/property/${p._id}`} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-zinc-800" onClick={(e) => e.stopPropagation()}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageUrl(img)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">{t('noPhoto')}</div>
        )}
      </Link>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-1">
          <Link href={`/property/${p._id}`} className="line-clamp-2 text-sm font-semibold text-blue-700 hover:underline dark:text-amber-400" onClick={(e) => e.stopPropagation()}>
            {p.title}
          </Link>
          <span onClick={(e) => e.stopPropagation()} className="flex shrink-0 flex-row gap-1">
            <CompareButton propertyId={p._id} size="sm" />
            <FavoriteButton propertyId={p._id} size="sm" />
          </span>
        </div>
        <div className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">
          {p.city || ''}
          {p.city && p.region ? ' • ' : ''}
          {p.region || ''}
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900 dark:text-amber-400">
          {currencySymbol}
          {p.price.toLocaleString()}
          {priceLabel}
        </div>
      </div>
    </div>
  );
}
