'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { Property } from '@/lib/types';

interface MapInnerProps {
  properties: Property[];
  onPick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  markerStyle?: 'default' | 'price';
  selectedPropertyId?: string | null;
  onPropertyMarkerClick?: (id: string | null) => void;
  richHoverTooltips?: boolean;
  onPropertyNavigate?: (id: string) => void;
}

const MapInner = dynamic<MapInnerProps>(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400 dark:bg-zinc-950 dark:text-zinc-500">
      რუკა იტვირთება...
    </div>
  )
});

export type MapViewProps = MapInnerProps & {
  className?: string;
  /** სიმაღლე: ნაგულისხმევად მთავარი გვერდის ბლოკი */
  heightClassName?: string;
};

export function MapView({
  properties,
  onPick,
  selectedLocation,
  center,
  zoom,
  markerStyle = 'default',
  selectedPropertyId,
  onPropertyMarkerClick,
  richHoverTooltips,
  onPropertyNavigate,
  className = '',
  heightClassName = 'h-[380px]'
}: MapViewProps) {
  return (
    <div
      className={`relative z-0 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${heightClassName} ${className}`.trim()}
    >
      <MapInner
        properties={properties}
        onPick={onPick}
        selectedLocation={selectedLocation}
        center={center}
        zoom={zoom}
        markerStyle={markerStyle}
        selectedPropertyId={selectedPropertyId}
        onPropertyMarkerClick={onPropertyMarkerClick}
        richHoverTooltips={richHoverTooltips}
        onPropertyNavigate={onPropertyNavigate}
      />
    </div>
  );
}
