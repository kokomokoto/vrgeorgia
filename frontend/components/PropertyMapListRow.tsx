'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import { isPanoramaPhoto } from '@/lib/panorama';
import { formatListedDate, getPropertyStreetLine } from '@/lib/propertyDisplay';
import { PropertyPriceRow } from '@/components/PropertyPriceRow';
import { PropertySpecChips } from '@/components/PropertySpecChips';
import CompareButton from './CompareButton';
import FavoriteButton from './FavoriteButton';

/** ფიქსირებული სიმაღლე — ყველა ბარათი ერთნაირი (რუკის სია) */
const MAP_LIST_ROW_H = 'h-[11rem]';

type Props = {
  p: Property;
  selected?: boolean;
  highlighted?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
};

export function PropertyMapListRow({
  p,
  selected,
  highlighted,
  onHover,
  onHoverEnd,
  rowRef
}: Props) {
  const { t } = useTranslation();
  const mainPhotoIndex = p.mainPhoto ?? 0;
  const img = p.photos?.[mainPhotoIndex] || p.photos?.[0];
  const street = getPropertyStreetLine(p);
  const addressLine = street || p.city || '';
  const listedAt = formatListedDate(p.createdAt);

  const stopNav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={rowRef}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={`${MAP_LIST_ROW_H} shrink-0 overflow-hidden rounded-lg border transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400/40 dark:border-amber-500 dark:bg-amber-950/40 dark:ring-amber-500/30'
          : highlighted
            ? 'border-blue-400 bg-blue-50/80 ring-1 ring-blue-300/50 dark:border-amber-600/80 dark:bg-amber-950/25 dark:ring-amber-500/25'
            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
      }`}
    >
      <Link
        href={`/property/${p._id}`}
        className={`flex ${MAP_LIST_ROW_H} items-stretch gap-2 p-1.5 text-left transition-shadow hover:shadow-sm`}
      >
        <div className="relative h-full w-28 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-zinc-800 sm:w-32">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(img, 'thumb', {
                isPanorama: isPanoramaPhoto(img, p.panoramaPhotos),
              })}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-slate-400">
              {t('no_photo')}
            </div>
          )}
          <div
            className="absolute right-0.5 top-0.5 z-10 flex flex-row gap-0.5"
            onClick={stopNav}
          >
            <CompareButton propertyId={p._id} size="sm" />
            <FavoriteButton propertyId={p._id} size="sm" />
          </div>
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1 py-0.5">
          <div className="min-h-6 shrink-0" onClick={stopNav}>
            <PropertyPriceRow p={p} compact />
          </div>

          <h3
            className="line-clamp-1 shrink-0 text-[13px] font-bold leading-snug text-slate-900 dark:text-amber-400"
            title={p.title}
          >
            {p.title}
          </h3>

          <div className="flex min-h-5 shrink-0 items-center gap-1 text-xs leading-normal text-slate-600 dark:text-zinc-400">
            <svg
              className="h-3 w-3 shrink-0 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="min-w-0 truncate" title={addressLine || undefined}>
              {addressLine || '—'}
            </span>
          </div>

          <div className="min-h-10 shrink-0 py-0.5" onClick={stopNav}>
            <PropertySpecChips p={p} compact gapClass="gap-1.5" />
          </div>

          <div className="mt-auto flex min-h-4 shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-1 text-[11px] leading-normal text-slate-400 dark:border-zinc-800 dark:text-zinc-500">
            <span className="truncate">{p.city || '—'}</span>
            {listedAt ? (
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {listedAt}
              </span>
            ) : (
              <span className="shrink-0 opacity-0" aria-hidden>
                —
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
