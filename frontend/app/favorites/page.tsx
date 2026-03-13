'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import FavoriteButton from '@/components/FavoriteButton';
import { getProperty } from '@/lib/api';
import type { Property } from '@/lib/types';

// localStorage-ში ფავორიტების წაკითხვა
const FAVORITES_KEY = 'vrgeorgia_favorites';
function getLocalFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function FavoritesPage() {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    
    const favoriteIds = getLocalFavorites();
    if (favoriteIds.length === 0) {
      setLoading(false);
      return;
    }

    // თითოეული ფავორიტის ჩატვირთვა
    Promise.all(
      favoriteIds.map(id => 
        getProperty(id)
          .then(res => res.property)
          .catch(() => null)
      )
    ).then(properties => {
      setFavorites(properties.filter((p): p is Property => p !== null));
      setLoading(false);
    });
  }, [hydrated]);

  // ფავორიტის წაშლისას განახლება
  const handleRemove = (propertyId: string) => {
    setFavorites(favorites.filter(f => f._id !== propertyId));
  };

  if (!hydrated) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (loading) {
    return <div className="text-sm text-slate-500">{t('loading')}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {t('favorites')} ({favorites.length})
        </h1>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="text-6xl mb-4">💔</div>
          <div className="text-slate-600 mb-4">{t('noFavorites')}</div>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('browseProperties')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((property) => {
            const mainPhotoIndex = property.mainPhoto || 0;
            const photo = property.photos?.[mainPhotoIndex] || property.photos?.[0];
            
            return (
              <div 
                key={property._id} 
                className="rounded-lg border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/property/${property._id}`}>
                  <div className="aspect-[4/3] relative">
                    {photo ? (
                      <img
                        src={`${API_BASE}${photo}`}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <span className="text-4xl">🏠</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2" onClick={(e) => { e.preventDefault(); handleRemove(property._id); }}>
                      <FavoriteButton propertyId={property._id} size="sm" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900 truncate">{property.title}</div>
                    <div className="text-sm text-slate-500">{property.city}</div>
                    <div className="text-lg font-bold text-blue-700 mt-1">
                      ${property.price.toLocaleString()}
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500 mt-2">
                      {property.sqm && <span>{property.sqm} კვ.მ</span>}
                      {property.rooms && <span>{property.rooms} ოთახი</span>}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
