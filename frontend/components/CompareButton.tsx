'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompare } from './CompareProvider';

interface CompareButtonProps {
  propertyId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CompareButton({ propertyId, size = 'md', className = '' }: CompareButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare, compareList, maxItems } = useCompare();
  const { t } = useTranslation();
  
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
      type="button"
      onClick={handleClick}
      disabled={!inCompare && isFull}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full transition-all ${
        inCompare
          ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
          : isFull
            ? 'cursor-not-allowed bg-slate-200/95 text-slate-400 shadow-md'
            : 'bg-white/95 text-slate-500 shadow-md hover:bg-white hover:text-blue-500'
      } ${className}`}
      title={inCompare ? t('removeFromCompare') : isFull ? `${t('max')} ${maxItems}` : t('addToCompare')}
      aria-pressed={inCompare}
    >
      <svg className={iconSizes[size]} viewBox="0 0 24 24" aria-hidden>
        <path
          fill={inCompare ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={inCompare ? 0 : 2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </button>
  );
}
