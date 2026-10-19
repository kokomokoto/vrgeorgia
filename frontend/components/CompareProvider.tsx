'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Property } from '@/lib/types';
import { ApiHttpError, getProperty } from '@/lib/api';

interface CompareContextType {
  compareList: string[];
  compareProperties: Property[];
  /** Listings that still open. Dead ids are not counted. */
  compareCount: number;
  compareLoading: boolean;
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  maxItems: number;
}

function isGoneListing(err: unknown): boolean {
  return err instanceof ApiHttpError && (err.status === 404 || err.status === 400);
}

function readCompareIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((id): id is string => typeof id === 'string' && id.trim().length >= 5);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

const CompareContext = createContext<CompareContextType | null>(null);

const MAX_COMPARE_ITEMS = 20;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<string[]>([]);
  const [compareProperties, setCompareProperties] = useState<Property[]>([]);
  const [compareCount, setCompareCount] = useState(0);
  const [compareLoading, setCompareLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setCompareList(readCompareIds(localStorage.getItem('compareList')));
    setHydrated(true);
  }, []);

  // Save to localStorage, drop listings that no longer open, keep the rest on network errors
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('compareList', JSON.stringify(compareList));
    let cancelled = false;

    if (compareList.length === 0) {
      setCompareProperties([]);
      setCompareCount(0);
      setCompareLoading(false);
      return;
    }

    setCompareLoading(true);
    Promise.all(
      compareList.map(async (id) => {
        try {
          const res = await getProperty(id);
          return { id, property: res.property, missing: false };
        } catch (err) {
          return { id, property: null, missing: isGoneListing(err) };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const valid = results.flatMap((row) => (row.property ? [row.property] : []));
      const kept = results.filter((row) => !row.missing).map((row) => row.id);
      setCompareProperties(valid);
      setCompareCount(valid.length);
      setCompareLoading(false);
      const same =
        kept.length === compareList.length && kept.every((id, index) => id === compareList[index]);
      if (!same) setCompareList(kept);
    });

    return () => {
      cancelled = true;
    };
  }, [compareList, hydrated]);

  const addToCompare = (id: string) => {
    if (compareList.length >= MAX_COMPARE_ITEMS) return;
    if (compareList.includes(id)) return;
    setCompareList([...compareList, id]);
    setCompareCount((n) => n + 1);
  };

  const removeFromCompare = (id: string) => {
    if (!compareList.includes(id)) return;
    setCompareList(compareList.filter((i) => i !== id));
    setCompareCount((n) => Math.max(0, n - 1));
  };

  const clearCompare = () => {
    setCompareList([]);
    setCompareCount(0);
  };

  const isInCompare = (id: string) => compareList.includes(id);

  return (
    <CompareContext.Provider value={{
      compareList,
      compareProperties,
      compareCount,
      compareLoading,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      maxItems: MAX_COMPARE_ITEMS
    }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within CompareProvider');
  }
  return context;
}
