// ვალუტის კურსის მოპოვება რეალურ დროში
import React from 'react';

const FALLBACK_RATE = 2.75; // თუ API არ მუშაობს
const CACHE_DURATION = 60 * 60 * 1000; // 1 საათი მილისეკუნდებში

interface CacheData {
  rate: number;
  timestamp: number;
}

let cache: CacheData | null = null;

export async function getUsdToGelRate(): Promise<number> {
  // შევამოწმოთ ქეში
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.rate;
  }

  try {
    // ვცდილობთ რამდენიმე API-ს
    const rate = await fetchFromExchangeRateApi() 
      || await fetchFromFrankfurter()
      || FALLBACK_RATE;
    
    // ვინახავთ ქეშში
    cache = { rate, timestamp: Date.now() };
    return rate;
  } catch (error) {
    console.error('Currency API error:', error);
    return cache?.rate || FALLBACK_RATE;
  }
}

// ExchangeRate-API (უფასო, 1500 მოთხოვნა თვეში)
async function fetchFromExchangeRateApi(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 } // Next.js cache 1 საათით
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates?.GEL || null;
  } catch {
    return null;
  }
}

// Frankfurter API (უფასო, შეუზღუდავი) - მხარს უჭერს GEL-ს
async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GEL', {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates?.GEL || null;
  } catch {
    return null;
  }
}

// React hook კლიენტის მხრიდან
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
