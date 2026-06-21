'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import type { MapBounds } from '@/lib/mapBounds';
import { cityHasDistrictZones } from '@/lib/districtZonesLayer';

interface MapInnerProps {
  properties: Property[];
  onPick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  markerStyle?: 'default' | 'price';
  selectedPropertyId?: string | null;
  /** სიიდან hover — მხოლოდ ანიმაცია, ინფო ფანჯარა არა */
  hoveredPropertyId?: string | null;
  onPropertyMarkerClick?: (id: string | null) => void;
  richHoverTooltips?: boolean;
  onPropertyNavigate?: (id: string) => void;
  onVisibleBoundsChange?: (bounds: MapBounds) => void;
  showKutaisiZones?: boolean;
  kutaisiZonesAutoFit?: boolean;
  showTbilisiZones?: boolean;
  tbilisiZonesAutoFit?: boolean;
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
  /** თბილისი/ქუთაისი — რუკაზე საზღვრების ფენის checkbox (ნაგულისხმევად გამორთ.) */
  districtZonesCity?: string;
  /** სრული ეკრანის ღილაკი (ატვირთვა, რედაქტირება) */
  expandable?: boolean;
};

export function MapView({
  properties,
  onPick,
  selectedLocation,
  center,
  zoom,
  markerStyle = 'default',
  selectedPropertyId,
  hoveredPropertyId,
  onPropertyMarkerClick,
  richHoverTooltips,
  onPropertyNavigate,
  onVisibleBoundsChange,
  showKutaisiZones,
  kutaisiZonesAutoFit,
  showTbilisiZones,
  tbilisiZonesAutoFit,
  districtZonesCity,
  className = '',
  heightClassName = 'h-[380px]',
  expandable = false,
}: MapViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zonesVisible, setZonesVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setZonesVisible(false);
  }, [districtZonesCity]);

  useEffect(() => {
    const syncFullscreen = () => {
      const host = containerRef.current;
      setIsFullscreen(Boolean(host && document.fullscreenElement === host));
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  const hasDistrictZonesToggle = cityHasDistrictZones(districtZonesCity);
  const resolvedShowKutaisi = hasDistrictZonesToggle
    ? districtZonesCity === 'ქუთაისი' && zonesVisible
    : Boolean(showKutaisiZones);
  const resolvedShowTbilisi = hasDistrictZonesToggle
    ? districtZonesCity === 'თბილისი' && zonesVisible
    : Boolean(showTbilisiZones);

  const layerLabel =
    districtZonesCity === 'თბილისი'
      ? t('map_district_zones_layer_tbilisi')
      : districtZonesCity === 'ქუთაისი'
        ? t('map_district_zones_layer_kutaisi')
        : t('map_district_zones_layer');

  const outerHeightClass =
    expandable && isFullscreen ? 'h-full min-h-0' : heightClassName;

  return (
    <div
      ref={expandable ? containerRef : undefined}
      className={`relative z-0 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${outerHeightClass} ${expandable ? 'map-view-fullscreen-host' : ''} ${className}`.trim()}
    >
      {hasDistrictZonesToggle && (
        <label className="absolute right-3 top-3 z-[1000] flex max-w-[calc(100%-1.5rem)] cursor-pointer items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-md backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={zonesVisible}
            onChange={(e) => setZonesVisible(e.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-500 dark:bg-zinc-800"
          />
          <span className="leading-snug">{layerLabel}</span>
        </label>
      )}
      {expandable && (
        <button
          type="button"
          aria-label={isFullscreen ? t('map_exit_fullscreen') : t('map_fullscreen')}
          title={isFullscreen ? t('map_exit_fullscreen') : t('map_fullscreen')}
          className="absolute bottom-3 right-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-lg bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </button>
      )}
      <MapInner
        properties={properties}
        onPick={onPick}
        selectedLocation={selectedLocation}
        center={center}
        zoom={zoom}
        markerStyle={markerStyle}
        selectedPropertyId={selectedPropertyId}
        hoveredPropertyId={hoveredPropertyId}
        onPropertyMarkerClick={onPropertyMarkerClick}
        richHoverTooltips={richHoverTooltips}
        onPropertyNavigate={onPropertyNavigate}
        onVisibleBoundsChange={onVisibleBoundsChange}
        showKutaisiZones={resolvedShowKutaisi}
        kutaisiZonesAutoFit={kutaisiZonesAutoFit}
        showTbilisiZones={resolvedShowTbilisi}
        tbilisiZonesAutoFit={tbilisiZonesAutoFit}
      />
    </div>
  );
}
