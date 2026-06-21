'use client';

import { useEffect, useRef } from 'react';
import { fetchTbilisiZonesFromMsda } from '@/lib/fetchTbilisiZonesMsda';
import type { TbilisiZonesFeatureCollection } from '@/lib/tbilisiZonesGeoJson';

type LeafletMap = {
  addLayer: (layer: unknown) => void;
  removeLayer: (layer: unknown) => void;
  fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => void;
};

function renderLayer(
  L: typeof import('leaflet'),
  group: ReturnType<typeof L.layerGroup>,
  geojson: TbilisiZonesFeatureCollection,
  options: {
    weight: number;
    fillOpacity: number;
    labelClass: string;
    showLabels: boolean;
  }
) {
  L.geoJSON(geojson, {
    style: (feature) => ({
      color: feature?.properties?.color || '#2563eb',
      weight: options.weight,
      fillColor: feature?.properties?.color || '#2563eb',
      fillOpacity: options.fillOpacity,
    }),
    onEachFeature: (feature, layer) => {
      const name = feature.properties?.name || '';
      if (options.showLabels) {
        const bounds = (layer as { getBounds?: () => { getCenter?: () => { lat: number; lng: number } } }).getBounds?.();
        const center = bounds?.getCenter?.();
        if (center && name) {
          const label = L.marker(center, {
            interactive: false,
            icon: L.divIcon({
              className: options.labelClass,
              html: `<span>${name}</span>`,
              iconSize: [0, 0],
            }),
          });
          group.addLayer(label);
        }
      }
      layer.bindTooltip(name, {
        sticky: true,
        direction: 'top',
        className: 'kutaisi-zone-tooltip',
      });
    },
  }).addTo(group);
}

function renderZones(
  L: typeof import('leaflet'),
  map: LeafletMap,
  raioni: TbilisiZonesFeatureCollection,
  ubani: TbilisiZonesFeatureCollection,
  autoFit: boolean,
  layerRef: React.MutableRefObject<unknown>,
  fittedRef: React.MutableRefObject<boolean>
) {
  if (layerRef.current) {
    map.removeLayer(layerRef.current);
    layerRef.current = null;
  }

  const group = L.layerGroup();

  renderLayer(L, group, raioni, {
    weight: 3,
    fillOpacity: 0.1,
    labelClass: 'kutaisi-zone-label tbilisi-raioni-label',
    showLabels: true,
  });

  renderLayer(L, group, ubani, {
    weight: 1.5,
    fillOpacity: 0.22,
    labelClass: 'kutaisi-zone-label tbilisi-ubani-label',
    showLabels: true,
  });

  group.addTo(map as Parameters<typeof group.addTo>[0]);
  layerRef.current = group;

  if (autoFit && !fittedRef.current) {
    const bounds = L.geoJSON(raioni as GeoJSON.GeoJsonObject).getBounds();
    map.fitBounds(bounds, { padding: [24, 24] });
    fittedRef.current = true;
  }
}

export function useTbilisiZonesMapLayer(
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

    Promise.all([import('leaflet'), fetchTbilisiZonesFromMsda()])
      .then(([L, bundle]) => {
        if (cancelled || !map) return;
        renderZones(L, map, bundle.raioni, bundle.ubani, autoFit, layerRef, fittedRef);
      })
      .catch((err) => {
        console.error('Tbilisi zones load failed:', err);
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
