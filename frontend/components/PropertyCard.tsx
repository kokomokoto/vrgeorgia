'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import FavoriteButton from './FavoriteButton';
import CompareButton from './CompareButton';

export function PropertyCard({ p }: { p: Property }) {
  const { t } = useTranslation();
  if (!p) return null;
  
  // მთავარი ფოტოს ინდექსი ან პირველი
  const mainPhotoIndex = p.mainPhoto ?? 0;
  const img = p.photos?.[mainPhotoIndex] || p.photos?.[0];
  
  // ვალუტის სიმბოლი
  const currencySymbol = p.priceCurrency === 'GEL' ? '₾' : '$';
  const priceLabel = p.priceType === 'per_sqm' ? t('per_sqm_suffix') : '';
  const years: string[] = [];
  if (p.constructionYear) years.push(`🏗️ ${p.constructionYear}`);
  if (p.renovationYear) years.push(`🛠️ ${p.renovationYear}`);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-slate-300 dark:border-amber-500/30 dark:bg-zinc-900 dark:hover:border-amber-500/60">
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <FavoriteButton propertyId={p._id} />
        <CompareButton propertyId={p._id} />
      </div>
      
      <Link href={`/property/${p._id}`} className="block">
        <div className="aspect-[16/10] bg-slate-50 dark:bg-zinc-800">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(img)} alt={p.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 dark:text-zinc-500">{t('no_photo')}</div>
          )}
        </div>
        <div className="p-3">
          <div className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-amber-400">{p.title}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-zinc-300">{p.city || ''}{p.city && p.region ? ' • ' : ''}{p.region || ''}</div>
          <div className="mt-2 text-sm font-semibold text-blue-700 dark:text-amber-400">{currencySymbol}{p.price.toLocaleString()}{priceLabel}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{t(p.type)} • {t(p.dealType === 'rent' ? 'rentType' : p.dealType === 'mortgage' ? 'mortgageType' : p.dealType)}{p.threeDLink ? ' • 3D' : ''}</div>
          {years.length > 0 && (
            <div className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{years.join(' • ')}</div>
          )}
        </div>
      </Link>
    </div>
  );
}
