'use client';

import { useEffect, useRef } from 'react';
import { fetchKutaisiZonesFromMsda } from '@/lib/fetchKutaisiZonesMsda';
import type { KutaisiZonesFeatureCollection } from '@/lib/kutaisiZonesGeoJson';

type LeafletMap = {
  addLayer: (layer: unknown) => void;
  removeLayer: (layer: unknown) => void;
  fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => void;
};

function renderZones(
  L: typeof import('leaflet'),
  map: LeafletMap,
  geojson: KutaisiZonesFeatureCollection,
  autoFit: boolean,
  layerRef: React.MutableRefObject<unknown>,
  fittedRef: React.MutableRefObject<boolean>
) {
  if (layerRef.current) {
    map.removeLayer(layerRef.current);
    layerRef.current = null;
  }

  const group = L.layerGroup();

  L.geoJSON(geojson, {
    style: (feature) => ({
      color: feature?.properties?.color || '#2563eb',
      weight: 2,
      fillColor: feature?.properties?.color || '#2563eb',
      fillOpacity: 0.22,
    }),
    onEachFeature: (feature, layer) => {
      const name = feature.properties?.name || '';
      const bounds = (layer as { getBounds?: () => { getCenter?: () => { lat: number; lng: number } } }).getBounds?.();
      const center = bounds?.getCenter?.();
      if (center && name) {
        const label = L.marker(center, {
          interactive: false,
          icon: L.divIcon({
            className: 'kutaisi-zone-label',
            html: `<span>${name}</span>`,
            iconSize: [0, 0],
          }),
        });
        group.addLayer(label);
      }
      layer.bindTooltip(name, {
        sticky: true,
        direction: 'top',
        className: 'kutaisi-zone-tooltip',
      });
    },
  }).addTo(group);

  group.addTo(map as Parameters<typeof group.addTo>[0]);
  layerRef.current = group;

  if (autoFit && !fittedRef.current) {
    const bounds = L.geoJSON(geojson).getBounds();
    map.fitBounds(bounds, { padding: [24, 24] });
    fittedRef.current = true;
  }
}

export function useKutaisiZonesMapLayer(
  map: LeafletMap | null,
  enabled: boolean,
  ready: boolean,
  autoFit = true
) {
  const layerRef = useRef<unknown>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !map || !ready) {
      if (map && layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      fittedRef.current = false;
      return;
    }

    let cancelled = false;

    Promise.all([import('leaflet'), fetchKutaisiZonesFromMsda()])
      .then(([L, geojson]) => {
        if (cancelled || !map) return;
        renderZones(L, map, geojson, autoFit, layerRef, fittedRef);
      })
      .catch((err) => {
        console.error('Kutaisi zones load failed:', err);
      });

    return () => {
      cancelled = true;
      if (map && layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled, ready, autoFit]);
}
