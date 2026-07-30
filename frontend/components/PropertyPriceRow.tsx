'use client';

import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import {
  convertDisplayMoney,
  displayCurrencySymbol,
  useCurrencyRate,
  type DisplayCurrency,
} from '@/lib/currency';
import { useDisplayCurrency } from '@/components/DisplayCurrencyProvider';
import { getPropertyPrices } from '@/lib/propertyDisplay';

export function PropertyPriceRow({
  p,
  className = '',
  compact = false,
}: {
  p: Property;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { rate: usdToGel } = useCurrencyRate();
  const { displayCurrency, toggleDisplayCurrency } = useDisplayCurrency();

  const nativeCurrency: DisplayCurrency = p.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  const { totalPrice, pricePerSqm } = getPropertyPrices(p);
  const displayTotal =
    totalPrice != null
      ? convertDisplayMoney(totalPrice, nativeCurrency, displayCurrency, usdToGel)
      : null;
  const displayPerSqm =
    pricePerSqm != null
      ? convertDisplayMoney(pricePerSqm, nativeCurrency, displayCurrency, usdToGel)
      : null;
  const symbol = displayCurrencySymbol(displayCurrency);

  if (displayTotal == null && displayPerSqm == null) return null;

  return (
    <div className={`flex min-w-0 flex-nowrap items-center gap-1.5 ${className}`}>
      {displayTotal != null && (
        <span
          data-property-price
          className={`shrink-0 font-bold leading-none tracking-tight ${
            compact ? 'text-base' : 'text-xl sm:text-2xl'
          }`}
        >
          {symbol}
          {displayTotal.toLocaleString()}
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleDisplayCurrency();
        }}
        className="inline-flex h-[1.25rem] shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-slate-100 px-0.5 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 sm:h-[1.5rem]"
        aria-label={
          displayCurrency === 'GEL'
            ? 'ფასი ლარში. დააწკაპუნეთ დოლარზე გადასართავად'
            : 'ფასი დოლარში. დააწკაპუნეთ ლარზე გადასართავად'
        }
      >
        <span
          className={`flex aspect-square h-full max-h-full min-w-[1.25rem] items-center justify-center rounded-full text-[10px] font-bold leading-none transition-all sm:min-w-[1.5rem] sm:text-xs ${
            displayCurrency === 'GEL'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-400 dark:text-zinc-500'
          }`}
        >
          ₾
        </span>
        <span
          className={`flex aspect-square h-full max-h-full min-w-[1.25rem] items-center justify-center rounded-full text-[10px] font-bold leading-none transition-all sm:min-w-[1.5rem] sm:text-xs ${
            displayCurrency === 'USD'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-400 dark:text-zinc-500'
          }`}
        >
          $
        </span>
      </button>

      {displayPerSqm != null && (
        <span className="ml-auto inline-flex min-w-0 shrink items-center gap-0.5 whitespace-nowrap pl-0.5 text-xs text-slate-500 dark:text-zinc-400 sm:text-sm">
          <span className="truncate font-medium text-slate-700 dark:text-zinc-300">
            {symbol}
            {displayPerSqm.toLocaleString()}
          </span>
          <span className="shrink-0">/ {t('sqm_unit_short')}</span>
        </span>
      )}
    </div>
  );
}
