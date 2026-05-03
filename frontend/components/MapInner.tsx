'use client';

import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function formatPriceLabel(p: Property): string {
  const sym = p.priceCurrency === 'GEL' ? '₾' : '$';
  const n = p.price;
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${sym}${Math.round(n / 1000)}k`;
  return `${sym}${n.toLocaleString()}`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHoverTooltipHtml(p: Property): string {
  const mainPhotoIndex = p.mainPhoto ?? 0;
  const rawImg = p.photos?.[mainPhotoIndex] || p.photos?.[0];
  const imgUrl = rawImg ? resolveImageUrl(rawImg) : '';
  const safeImg =
    imgUrl && (/^https?:\/\//i.test(imgUrl) || imgUrl.startsWith('data:image/'))
      ? escapeHtml(imgUrl)
      : '';
  const sym = p.priceCurrency === 'GEL' ? '₾' : '$';
  const thumb = safeImg
    ? `<img src="${safeImg}" alt="" width="140" height="88" loading="lazy" style="display:block;border-radius:6px;object-fit:cover;width:140px;height:88px;" />`
    : `<div style="width:140px;height:88px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b;">—</div>`;
  return `<div style="text-align:left;min-width:140px;max-width:220px;">
${thumb}
<div style="margin-top:6px;font-weight:700;font-size:13px;line-height:1.25;">${escapeHtml(p.title)}</div>
<div style="margin-top:4px;font-size:14px;font-weight:700;color:#059669;">${sym}${p.price.toLocaleString()}</div>
</div>`;
}

interface MapInnerProps {
  properties: Property[];
  onPick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  /** Booking-სტილის ფასის ბეიჯები რუკაზე */
  markerStyle?: 'default' | 'price';
  selectedPropertyId?: string | null;
  onPropertyMarkerClick?: (id: string | null) => void;
  /** მაუსის მიტანისას: სათაური, ფასი, ფოტო (სრული რუკის ხედი) */
  richHoverTooltips?: boolean;
  /** დაკლიკება → განცხადების გვერდზე გადასვლა (popup არ იხსნება) */
  onPropertyNavigate?: (id: string) => void;
}

export default function MapInner({
  properties,
  onPick,
  selectedLocation,
  center,
  zoom,
  markerStyle = 'default',
  selectedPropertyId = null,
  onPropertyMarkerClick,
  richHoverTooltips = false,
  onPropertyNavigate
}: MapInnerProps) {
  const { isDark } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  const onPropertyMarkerClickRef = useRef(onPropertyMarkerClick);
  const onPropertyNavigateRef = useRef(onPropertyNavigate);
  const selectedMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const defaultCenter = center || { lat: 42.1, lng: 43.5 };
  const defaultZoom = zoom || 7;

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    onPropertyMarkerClickRef.current = onPropertyMarkerClick;
  }, [onPropertyMarkerClick]);

  useEffect(() => {
    onPropertyNavigateRef.current = onPropertyNavigate;
  }, [onPropertyNavigate]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return;

      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const map = L.map(mapRef.current!).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);

      const initialTile = document.documentElement.classList.contains('dark') ? TILE_DARK : TILE_LIGHT;
      const attribution =
        initialTile === TILE_DARK ? '&copy; OpenStreetMap &copy; CARTO' : '&copy; OpenStreetMap contributors';
      const tl = L.tileLayer(initialTile, { attribution }).addTo(map);
      tileLayerRef.current = tl;

      map.on('click', (e: any) => {
        if (onPickRef.current) {
          onPickRef.current(e.latlng.lat, e.latlng.lng);
        } else if (onPropertyMarkerClickRef.current) {
          onPropertyMarkerClickRef.current(null);
        }
      });

      mapInstanceRef.current = map;
      setReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const tl = tileLayerRef.current;
    if (!tl || typeof tl.setUrl !== 'function') return;
    const url = isDark ? TILE_DARK : TILE_LIGHT;
    tl.setUrl(url);
    const attr =
      url === TILE_DARK ? '&copy; OpenStreetMap &copy; CARTO' : '&copy; OpenStreetMap contributors';
    if (typeof tl.options !== 'undefined') tl.options.attribution = attr;
    tl.redraw?.();
  }, [isDark]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;

      const markerColors: Record<string, string> = {
        apartment: 'blue',
        house: 'green',
        commercial: 'orange',
        land: 'yellow',
        cottage: 'violet',
        hotel: 'gold',
        building: 'red',
        warehouse: 'grey',
        parking: 'black',
        business: 'blue'
      };

      const createColoredIcon = (color: string) =>
        L.icon({
          iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && layer !== selectedMarkerRef.current) {
          map.removeLayer(layer);
        }
      });

      const openOnNavigate = Boolean(onPropertyNavigate);

      properties.forEach((p) => {
        const selected = p._id === selectedPropertyId;
        let marker: any;

        if (markerStyle === 'price') {
          const label = formatPriceLabel(p);
          const innerClass =
            'map-price-pin__inner' + (selected ? ' map-price-pin__inner--selected' : '');
          const icon = L.divIcon({
            className: 'map-price-pin',
            html: `<div class="${innerClass}">${label}</div>`,
            iconSize: [88, 28],
            iconAnchor: [44, 14]
          });
          marker = L.marker([p.location.lat, p.location.lng], { icon, zIndexOffset: selected ? 800 : 0 }).addTo(
            map
          );
        } else {
          const color = markerColors[p.type] || 'blue';
          const icon = createColoredIcon(color);
          marker = L.marker([p.location.lat, p.location.lng], { icon, zIndexOffset: selected ? 500 : 0 }).addTo(
            map
          );
        }

        if (richHoverTooltips) {
          marker.bindTooltip(buildHoverTooltipHtml(p), {
            direction: 'top',
            offset: [0, markerStyle === 'price' ? -14 : -36],
            opacity: 1,
            sticky: true,
            interactive: true,
            className: 'map-property-tooltip'
          });
        }

        if (openOnNavigate) {
          const el = marker.getElement?.() as HTMLElement | undefined;
          if (el) el.style.cursor = 'pointer';
          marker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            onPropertyNavigateRef.current?.(p._id);
          });
        } else {
          marker.bindPopup(`
          <div style="min-width: 150px;">
            <a href="/property/${p._id}" style="font-size: 14px; font-weight: 600; color: #1e40af; text-decoration: none; display: block; margin-bottom: 4px;">
              ${String(p.title).replace(/</g, '&lt;')}
            </a>
            <div style="font-size: 13px; color: #059669; font-weight: 500;">
              ${p.priceCurrency === 'GEL' ? '₾' : '$'}${p.price.toLocaleString()}
            </div>
            ${p.city ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${String(p.city).replace(/</g, '&lt;')}</div>` : ''}
          </div>
        `);
          marker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            onPropertyMarkerClickRef.current?.(p._id);
          });
        }
      });
    });
  }, [properties, ready, markerStyle, selectedPropertyId, richHoverTooltips, onPropertyNavigate]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !selectedPropertyId) return;
    const p = properties.find((x) => x._id === selectedPropertyId);
    if (!p) return;
    const map = mapInstanceRef.current;
    const z = Math.max(map.getZoom(), 14);
    map.setView([p.location.lat, p.location.lng], z, { animate: true, duration: 0.35 });
  }, [selectedPropertyId, ready, properties]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;

      if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
      }

      if (selectedLocation) {
        const redIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        selectedMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { icon: redIcon }).addTo(
          map
        );
        selectedMarkerRef.current.bindPopup('არჩეული ლოკაცია').openPopup();
      }
    });
  }, [selectedLocation, ready]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !center) return;
    mapInstanceRef.current.setView([center.lat, center.lng], zoom || 17);
  }, [center, zoom, ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
