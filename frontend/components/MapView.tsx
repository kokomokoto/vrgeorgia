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
}

// Leaflet არ მუშაობს სერვერზე, მხოლოდ ბრაუზერში ჩავტვირთოთ
const MapInner = dynamic<MapInnerProps>(() => import('./MapInner'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400">
      რუკა იტვირთება...
    </div>
  )
});

export function MapView({ properties, onPick, selectedLocation, center, zoom }: MapInnerProps) {
  return (
    <div className="relative z-0 h-[380px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
      <MapInner properties={properties} onPick={onPick} selectedLocation={selectedLocation} center={center} zoom={zoom} />
    </div>
  );
}
