'use client';

import React from 'react';
import { useCompare } from './CompareProvider';

interface CompareButtonProps {
  propertyId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CompareButton({ propertyId, size = 'md', className = '' }: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare, compareList, maxItems } = useCompare();
  
  const inCompare = isInCompare(propertyId);
  const isFull = compareList.length >= maxItems;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inCompare) {
      removeFromCompare(propertyId);
    } else if (!isFull) {
      addToCompare(propertyId);
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
      disabled={!inCompare && isFull}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
        inCompare 
          ? 'bg-blue-500 text-white hover:bg-blue-600' 
          : isFull
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white/90 text-slate-500 hover:bg-white hover:text-blue-500'
      } shadow-md ${className}`}
      title={inCompare ? 'წაშლა შედარებიდან' : isFull ? `მაქს. ${maxItems} ქონება` : 'შედარებაში დამატება'}
    >
      <svg 
        className={iconSizes[size]} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {inCompare ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m-7-4l3-8 3 8m-5.5-2h5M16 7l3 8m-5.5 0h5L16 7z" />
        )}
      </svg>
    </button>
  );
}
