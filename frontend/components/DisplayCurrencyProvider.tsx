'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DisplayCurrency } from '@/lib/currency';

const DISPLAY_CURRENCY_KEY = 'vr-display-currency';

type DisplayCurrencyContextValue = {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: DisplayCurrency) => void;
  toggleDisplayCurrency: () => void;
};

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>('USD');

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(DISPLAY_CURRENCY_KEY);
      if (stored === 'GEL' || stored === 'USD') setDisplayCurrencyState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDisplayCurrency = useCallback(() => {
    setDisplayCurrencyState((prev) => {
      const next: DisplayCurrency = prev === 'GEL' ? 'USD' : 'GEL';
      try {
        localStorage.setItem(DISPLAY_CURRENCY_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ displayCurrency, setDisplayCurrency, toggleDisplayCurrency }),
    [displayCurrency, setDisplayCurrency, toggleDisplayCurrency]
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    throw new Error('useDisplayCurrency must be used within DisplayCurrencyProvider');
  }
  return ctx;
}
