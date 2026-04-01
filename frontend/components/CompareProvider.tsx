'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Property } from '@/lib/types';
import { getProperty } from '@/lib/api';

interface CompareContextType {
  compareList: string[];
  compareProperties: Property[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  maxItems: number;
}

const CompareContext = createContext<CompareContextType | null>(null);

const MAX_COMPARE_ITEMS = 20;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<string[]>([]);
  const [compareProperties, setCompareProperties] = useState<Property[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('compareList');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompareList(parsed);
      } catch {}
    }
    setHydrated(true);
  }, []);

  // Save to localStorage and fetch properties
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('compareList', JSON.stringify(compareList));
    
    // Fetch property details
    if (compareList.length > 0) {
      Promise.all(compareList.map(id => getProperty(id).catch(() => null)))
        .then(results => {
          const valid = results.filter(r => r !== null).map(r => r!.property);
          setCompareProperties(valid);
        });
    } else {
      setCompareProperties([]);
    }
  }, [compareList, hydrated]);

  const addToCompare = (id: string) => {
    if (compareList.length >= MAX_COMPARE_ITEMS) return;
    if (compareList.includes(id)) return;
    setCompareList([...compareList, id]);
  };

  const removeFromCompare = (id: string) => {
    setCompareList(compareList.filter(i => i !== id));
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const isInCompare = (id: string) => compareList.includes(id);

  return (
    <CompareContext.Provider value={{
      compareList,
      compareProperties,
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
