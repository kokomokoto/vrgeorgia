'use client';

import React, { useState, useEffect } from 'react';

interface FavoriteButtonProps {
  propertyId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// localStorage-ში ფავორიტების მართვა (ყველა მომხმარებლისთვის)
const FAVORITES_KEY = 'vrgeorgia_favorites';

function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const addFavorite = (id: string) => {
    const updated = [...favorites, id];
    setFavorites(updated);
    saveFavorites(updated);
  };

  const removeFavorite = (id: string) => {
    const updated = favorites.filter(f => f !== id);
    setFavorites(updated);
    saveFavorites(updated);
  };

  const isFavorite = (id: string) => favorites.includes(id);

  return { favorites, addFavorite, removeFavorite, isFavorite };
}

export default function FavoriteButton({ propertyId, size = 'md', className = '' }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(getFavorites().includes(propertyId));
  }, [propertyId]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const favorites = getFavorites();
    if (isFavorite) {
      saveFavorites(favorites.filter(f => f !== propertyId));
      setIsFavorite(false);
    } else {
      saveFavorites([...favorites, propertyId]);
      setIsFavorite(true);
    }
  };

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
        isFavorite 
          ? 'bg-red-500 text-white hover:bg-red-600' 
          : 'bg-white/90 text-slate-500 hover:bg-white hover:text-red-500'
      } shadow-md ${className}`}
      title={isFavorite ? 'წაშლა ფავორიტებიდან' : 'დამატება ფავორიტებში'}
    >
      <svg 
        className={iconSizes[size]} 
        fill={isFavorite ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
        />
      </svg>
    </button>
  );
}
