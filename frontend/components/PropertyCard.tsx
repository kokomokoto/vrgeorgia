'use client';

import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import { isPanoramaPhoto } from '@/lib/panorama';
import { formatListedDate, getPropertyStreetLine } from '@/lib/propertyDisplay';
import { PropertyPriceRow } from '@/components/PropertyPriceRow';
import { PropertySpecChips } from '@/components/PropertySpecChips';
import CompareButton from './CompareButton';
import FavoriteButton from './FavoriteButton';
import { Shimmer } from './Skeleton';
import { useHorizontalSwipe } from '@/lib/useHorizontalSwipe';

export function PropertyCard({
  p,
  compactPhoto = false,
}: {
  p: Property;
  /** უფრო დაბალი ფოტო (მთავარი გვერდი) */
  compactPhoto?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const mainPhotoIndex = Math.min(p.mainPhoto ?? 0, Math.max(0, (p.photos?.length ?? 1) - 1));
  const photos = p.photos?.length ? p.photos : [];
  const [activeIndex, setActiveIndex] = React.useState(mainPhotoIndex);
  const [loadedIndices, setLoadedIndices] = React.useState<Set<number>>(() => new Set([mainPhotoIndex]));
  const loadedRef = React.useRef(new Set<number>([mainPhotoIndex]));
  const loadingRef = React.useRef(new Set<number>());

  const loadPhoto = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= photos.length) return;
      if (loadedRef.current.has(index) || loadingRef.current.has(index)) return;

      loadingRef.current.add(index);
      const img = new Image();
      const finish = () => {
        loadingRef.current.delete(index);
        loadedRef.current.add(index);
        setLoadedIndices(new Set(loadedRef.current));
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = resolveImageUrl(photos[index], 'thumb', {
        isPanorama: isPanoramaPhoto(photos[index], p.panoramaPhotos),
      });
    },
    [photos]
  );

  React.useEffect(() => {
    loadedRef.current = new Set([mainPhotoIndex]);
    loadingRef.current = new Set();
    setLoadedIndices(new Set([mainPhotoIndex]));
    setActiveIndex(mainPhotoIndex);
  }, [mainPhotoIndex, p._id]);

  /** მთავარი ფოტოები ჯერ, დანარჩენი ფონურად — hover-ზე უკვე ჩატვირთული იქნება */
  React.useEffect(() => {
    if (photos.length <= 1) return;
    const timer = window.setTimeout(() => {
      photos.forEach((_, i) => loadPhoto(i));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [photos, mainPhotoIndex, p._id, loadPhoto]);

  if (!p) return null;

  // ტექსტი უკვე ნათარგმნია სერვერზე (?lang=) და ქეშირებულია ბაზაში —
  // client-ზე თითო იუზერისთვის თავიდან თარგმნა აღარ ხდება.
  const currentLang = i18n.language || 'ka';
  const displayTitle = p.title;
  const displayStreet = getPropertyStreetLine(p);
  const displayCity = p.city || '';
  const listedAt = formatListedDate(p.createdAt, currentLang);

  const stopNav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /** მაუსის ჰორიზონტალური პოზიციით — ფოტოები თანმიმდევრობით (ბოლოში ისევ პირველი) */
  const handlePhotoMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (photos.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const idx = Math.floor((x / rect.width) * photos.length) % photos.length;
    loadPhoto(idx);
    setActiveIndex(idx);
  };

  const handlePhotoMouseLeave = () => {
    setActiveIndex(mainPhotoIndex);
  };

  const shownIndex = loadedIndices.has(activeIndex) ? activeIndex : mainPhotoIndex;

  const goPhotoPrev = React.useCallback(() => {
    setActiveIndex((i) => {
      const next = Math.max(0, i - 1);
      loadPhoto(next);
      return next;
    });
  }, [loadPhoto]);

  const goPhotoNext = React.useCallback(() => {
    setActiveIndex((i) => {
      const next = Math.min(photos.length - 1, i + 1);
      loadPhoto(next);
      return next;
    });
  }, [loadPhoto, photos.length]);

  const photoSwipe = useHorizontalSwipe({
    onSwipeLeft: photos.length > 1 && activeIndex < photos.length - 1 ? goPhotoNext : undefined,
    onSwipeRight: photos.length > 1 && activeIndex > 0 ? goPhotoPrev : undefined,
  });

  return (
    <div
      data-property-card
      className="group overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20"
    >
      <Link href={`/property/${p._id}`} className="block">
        <div
          className={`relative bg-slate-100 dark:bg-zinc-800 ${
            compactPhoto ? 'aspect-[3/2]' : 'aspect-[4/3]'
          } touch-pan-y`}
          onMouseMove={handlePhotoMouseMove}
          onMouseLeave={handlePhotoMouseLeave}
          onTouchStart={photoSwipe.onTouchStart}
          onTouchMove={photoSwipe.onTouchMove}
          onTouchEnd={photoSwipe.onTouchEnd}
          onClick={(e) => {
            if (photoSwipe.consumeSwipe()) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {photos.length > 0 ? (
            <>
              {!loadedIndices.has(shownIndex) && (
                <Shimmer className="absolute inset-0 h-full w-full" />
              )}
              {photos.map((photo, i) => {
                if (!loadedIndices.has(i)) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${photo}-${i}`}
                    src={resolveImageUrl(photo, 'thumb', {
                      isPanorama: isPanoramaPhoto(photo, p.panoramaPhotos),
                    })}
                    alt={i === shownIndex ? displayTitle : ''}
                    loading={i === mainPhotoIndex ? 'lazy' : undefined}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                      i === shownIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                    draggable={false}
                  />
                );
              })}
            </>
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
            data-property-title
            className={`line-clamp-1 break-words font-bold ${
              compactPhoto ? 'text-[15px] leading-[1.3]' : 'text-[15px] leading-snug'
            }`}
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          {(displayStreet || displayCity) && (
            <div data-property-muted className="flex min-w-0 items-start gap-1.5 text-sm">
              <svg className="mt-0.5 h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1 min-w-0 break-words" title={displayStreet || displayCity}>
                {displayStreet || displayCity}
              </span>
            </div>
          )}

          <div onClick={stopNav}>
            <PropertySpecChips p={p} gapClass={compactPhoto ? 'gap-1.5' : 'gap-2'} />
          </div>
          </div>

          <div
            data-property-muted
            className={`flex items-center justify-between gap-2 border-t text-xs leading-tight ${
              compactPhoto ? 'mt-1 pt-1' : 'mt-1.5 pt-1.5'
            }`}
            style={{ borderColor: 'var(--theme-surface-border)' }}
          >
            <span className="truncate">{displayCity || '—'}</span>
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
