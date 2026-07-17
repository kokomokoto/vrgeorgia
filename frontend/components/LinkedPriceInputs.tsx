'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormattedNumberInput } from './FormattedNumberInput';

type PriceType = 'total' | 'per_sqm';
type Currency = 'USD' | 'GEL';

type Props = {
  price: string;
  priceType: PriceType;
  priceCurrency: Currency;
  /** სახლის ფართობი თუ არის, წინააღმდეგ შემთხვევაში მიწის/ზოგადი */
  areaSqm: number;
  onPriceChange: (price: string) => void;
  onPriceTypeChange: (priceType: PriceType) => void;
  onCurrencyChange: (currency: Currency) => void;
};

function roundPositiveMoney(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.round(n));
}

const inputClassName =
  'w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

/**
 * სრული ფასი + კვ.მ ფასი — ერთის შეყვანა ავტომატურად ითვლის მეორეს (ფართობის მიხედვით).
 * API-ში ინახება ბოლოს რედაქტირებული ველი + priceType.
 */
export function LinkedPriceInputs({
  price,
  priceType,
  priceCurrency,
  areaSqm,
  onPriceChange,
  onPriceTypeChange,
  onCurrencyChange,
}: Props) {
  const { t } = useTranslation();
  const num = Number(price);
  const hasPrice = price !== '' && Number.isFinite(num) && num > 0;
  const hasArea = Number.isFinite(areaSqm) && areaSqm > 0;

  let totalValue = '';
  let perSqmValue = '';
  if (priceType === 'total') {
    totalValue = price;
    if (hasPrice && hasArea) perSqmValue = roundPositiveMoney(num / areaSqm);
  } else {
    perSqmValue = price;
    if (hasPrice && hasArea) totalValue = roundPositiveMoney(num * areaSqm);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-700">💵 {t('price_label_icon')}</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => onCurrencyChange('USD')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              priceCurrency === 'USD'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            $
          </button>
          <button
            type="button"
            onClick={() => onCurrencyChange('GEL')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              priceCurrency === 'GEL'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            ₾
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('total_price')}</label>
          <FormattedNumberInput
            className={inputClassName}
            placeholder="0"
            value={totalValue}
            onChange={(v) => {
              onPriceTypeChange('total');
              onPriceChange(v);
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('price_per_sqm')}</label>
          <FormattedNumberInput
            className={inputClassName}
            placeholder="0"
            value={perSqmValue}
            onChange={(v) => {
              onPriceTypeChange('per_sqm');
              onPriceChange(v);
            }}
          />
        </div>
      </div>

      {!hasArea && (
        <p className="mt-1.5 text-xs text-slate-400">{t('price_linked_needs_area')}</p>
      )}
    </div>
  );
}
