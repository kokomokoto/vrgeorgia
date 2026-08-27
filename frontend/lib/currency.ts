// ვალუტის კურსი — ჯერ backend (იგივე რაც ფასის სორტი), მერე გარე API
import React from 'react';
import { getApiBase } from './config';

const FALLBACK_RATE = 2.75;
const CACHE_DURATION = 60 * 60 * 1000;

interface CacheData {
  rate: number;
  timestamp: number;
}

let cache: CacheData | null = null;

export async function getUsdToGelRate(): Promise<number> {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.rate;
  }

  try {
    const rate =
      (await fetchFromBackend()) ||
      (await fetchFromExchangeRateApi()) ||
      (await fetchFromFrankfurter()) ||
      cache?.rate ||
      FALLBACK_RATE;

    cache = { rate, timestamp: Date.now() };
    return rate;
  } catch (error) {
    console.error('Currency API error:', error);
    return cache?.rate || FALLBACK_RATE;
  }
}

/** Backend-ის კურსი = ფასის სორტის კურსი → სია და ჩვენება ემთხვევა */
async function fetchFromBackend(): Promise<number | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/currency/rate`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data?.usdToGel);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchFromExchangeRateApi(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.rates?.GEL);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GEL');
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.rates?.GEL);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

export function useCurrencyRate() {
  const [rate, setRate] = React.useState(FALLBACK_RATE);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getUsdToGelRate()
      .then(setRate)
      .finally(() => setLoading(false));
  }, []);

  return { rate, loading };
}

export type DisplayCurrency = 'GEL' | 'USD';

export function convertDisplayMoney(
  amount: number,
  from: DisplayCurrency,
  to: DisplayCurrency,
  usdToGel: number
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'GEL') return Math.round(amount * usdToGel);
  return Math.round(amount / usdToGel);
}

export function displayCurrencySymbol(c: DisplayCurrency): string {
  return c === 'GEL' ? '₾' : '$';
}
