'use client';

import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import { formatListedDate, getPropertyStreetLine } from '@/lib/propertyDisplay';
import { PropertyPriceRow } from '@/components/PropertyPriceRow';
import { PropertySpecChips } from '@/components/PropertySpecChips';
import CompareButton from './CompareButton';
import FavoriteButton from './FavoriteButton';

export function PropertyCard({
  p,
  compactPhoto = false,
}: {
  p: Property;
  /** უფრო დაბალი ფოტო (მთავარი გვერდი) */
  compactPhoto?: boolean;
}) {
  const { t } = useTranslation();
  const mainPhotoIndex = Math.min(p.mainPhoto ?? 0, Math.max(0, (p.photos?.length ?? 1) - 1));
  const photos = p.photos?.length ? p.photos : [];
  const [activeIndex, setActiveIndex] = React.useState(mainPhotoIndex);

  React.useEffect(() => {
    setActiveIndex(mainPhotoIndex);
  }, [mainPhotoIndex, p._id]);

  if (!p) return null;

  const street = getPropertyStreetLine(p);
  const listedAt = formatListedDate(p.createdAt);

  const stopNav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /** მაუსის ჰორიზონტალური პოზიციით — ფოტოები თანმიმდევრობით */
  const handlePhotoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (photos.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const idx = Math.min(photos.length - 1, Math.floor((x / rect.width) * photos.length));
    setActiveIndex(idx);
  };

  const handlePhotoMouseLeave = () => {
    setActiveIndex(mainPhotoIndex);
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/80 dark:bg-zinc-900 dark:hover:shadow-lg dark:hover:shadow-black/20">
      <Link href={`/property/${p._id}`} className="block">
        <div
          className={`relative bg-slate-100 dark:bg-zinc-800 ${
            compactPhoto ? 'aspect-[3/2]' : 'aspect-[4/3]'
          }`}
          onMouseMove={handlePhotoMouseMove}
          onMouseLeave={handlePhotoMouseLeave}
        >
          {photos.length > 0 ? (
            photos.map((photo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${photo}-${i}`}
                src={resolveImageUrl(photo)}
                alt={i === activeIndex ? p.title : ''}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                  i === activeIndex ? 'opacity-100' : 'opacity-0'
                }`}
                draggable={false}
              />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 dark:text-zinc-500">
              {t('no_photo')}
            </div>
          )}

          <div className="absolute right-2 top-2 z-10 flex flex-row gap-1.5" onClick={stopNav}>
            <CompareButton propertyId={p._id} size="md" />
            <FavoriteButton propertyId={p._id} size="md" />
          </div>

          {photos.length > 1 && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-black/25 px-2 py-1">
              {photos.slice(0, 8).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === activeIndex ? 'bg-white' : 'bg-white/45'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className={`min-w-0 overflow-hidden ${
            compactPhoto ? 'px-3 pb-2 pt-1.5' : 'px-3.5 pb-3 pt-2.5'
          }`}
        >
          <div onClick={stopNav}>
            <PropertyPriceRow p={p} />
          </div>

          <div className={`flex flex-col ${compactPhoto ? 'mt-1 gap-1.5' : 'mt-1.5 gap-2.5'}`}>
          <h3
            className={`line-clamp-1 break-words font-bold text-slate-900 dark:text-amber-400 ${
              compactPhoto ? 'text-[15px] leading-[1.3]' : 'text-[15px] leading-snug'
            }`}
            title={p.title}
          >
            {p.title}
          </h3>

          {(street || p.city) && (
            <div className="flex min-w-0 items-start gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1 min-w-0 break-words" title={street || p.city}>
                {street || p.city}
              </span>
            </div>
          )}

          <div onClick={stopNav}>
            <PropertySpecChips p={p} gapClass={compactPhoto ? 'gap-1.5' : 'gap-2'} />
          </div>
          </div>

          <div
            className={`flex items-center justify-between gap-2 border-t border-slate-100 text-xs leading-tight text-slate-400 dark:border-zinc-800 dark:text-zinc-500 ${
              compactPhoto ? 'mt-1 pt-1' : 'mt-1.5 pt-1.5'
            }`}
          >
            <span className="truncate">{p.city || '—'}</span>
            {listedAt ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {listedAt}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
