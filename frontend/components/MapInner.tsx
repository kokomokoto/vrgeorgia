'use client';

import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import { isPanoramaPhoto } from '@/lib/panorama';
import type { MapBounds } from '@/lib/mapBounds';
import { useTheme } from '@/components/ThemeProvider';
import { useKutaisiZonesMapLayer } from '@/components/KutaisiZonesMapLayer';
import { useTbilisiZonesMapLayer } from '@/components/TbilisiZonesMapLayer';

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

function formatMapArea(p: Property): string {
  const sqm = Number(p.sqm) || 0;
  const house = Number(p.houseSqm) || 0;
  if (house > 0 && sqm > 0 && house !== sqm) return `${house} / ${sqm} მ²`;
  if (sqm > 0) return `${sqm} მ²`;
  if (house > 0) return `${house} მ²`;
  return '';
}

function buildHoverTooltipHtml(p: Property): string {
  const mainPhotoIndex = p.mainPhoto ?? 0;
  const rawImg = p.photos?.[mainPhotoIndex] || p.photos?.[0];
  const imgUrl = rawImg
    ? resolveImageUrl(rawImg, 'thumb', {
        isPanorama: isPanoramaPhoto(rawImg, p.panoramaPhotos),
      })
    : '';
  const safeImg =
    imgUrl && (/^https?:\/\//i.test(imgUrl) || imgUrl.startsWith('data:image/'))
      ? escapeHtml(imgUrl)
      : '';
  const sym = p.priceCurrency === 'GEL' ? '₾' : '$';
  const area = formatMapArea(p);
  const thumb = safeImg
    ? `<img src="${safeImg}" alt="" width="200" height="88" loading="lazy" class="map-property-card__img" />`
    : `<div class="map-property-card__img map-property-card__img--empty">—</div>`;
  const areaHtml = area
    ? `<span class="map-property-card__area">${escapeHtml(area)}</span>`
    : '';
  const href = `/property/${encodeURIComponent(p._id)}`;
  return `<a href="${href}" class="map-property-card__link" draggable="false">
<div class="map-property-card">
${thumb}
<div class="map-property-card__title">${escapeHtml(p.title)}</div>
<div class="map-property-card__meta">
<span class="map-property-card__price">${sym}${p.price.toLocaleString()}</span>
${areaHtml}
</div>
</div>
</a>`;
}

const PINNED_POPUP_OPTIONS = {
  maxWidth: 260,
  minWidth: 200,
  autoClose: false,
  closeOnClick: false,
  className: 'map-property-popup map-property-tooltip'
};

function openPinnedPropertyPopup(marker: any, prop: Property) {
  const html = buildHoverTooltipHtml(prop);
  const popup = marker.getPopup?.();
  if (popup) {
    popup.setContent(html);
  } else {
    marker.bindPopup(html, PINNED_POPUP_OPTIONS);
  }
  marker.closeTooltip();
  marker.openPopup();
}

function closePinnedPropertyPopup(marker: any) {
  marker.closePopup?.();
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
  /** სიიდან hover — ანიმაცია, არა tooltip */
  hoveredPropertyId?: string | null;
  onPropertyMarkerClick?: (id: string | null) => void;
  /** მაუსის მიტანისას: სათაური, ფასი, ფოტო (სრული რუკის ხედი) */
  richHoverTooltips?: boolean;
  /** დაკლიკება → განცხადების გვერდზე გადასვლა (popup არ იხსნება) */
  onPropertyNavigate?: (id: string) => void;
  /** რუკის ხილული ჩარჩო (სიის ფილტრაცია რუკაზე ძებნაში) */
  onVisibleBoundsChange?: (bounds: MapBounds) => void;
  /** ქუთაისის უბნების საზღვრები და სახელები */
  showKutaisiZones?: boolean;
  /** ქუთაისის ზონებზე ავტომატური zoom (pin-ის არსებობისას გამორთეთ) */
  kutaisiZonesAutoFit?: boolean;
  /** თბილისის რაიონული/საუბნო საზღვრები და სახელები */
  showTbilisiZones?: boolean;
  /** თბილისის ზონებზე ავტომატური zoom */
  tbilisiZonesAutoFit?: boolean;
}

export default function MapInner({
  properties,
  onPick,
  selectedLocation,
  center,
  zoom,
  markerStyle = 'default',
  selectedPropertyId = null,
  hoveredPropertyId = null,
  onPropertyMarkerClick,
  richHoverTooltips = false,
  onPropertyNavigate,
  onVisibleBoundsChange,
  showKutaisiZones = false,
  kutaisiZonesAutoFit = true,
  showTbilisiZones = false,
  tbilisiZonesAutoFit = true
}: MapInnerProps) {
  const { isDark } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  const onPropertyMarkerClickRef = useRef(onPropertyMarkerClick);
  const onPropertyNavigateRef = useRef(onPropertyNavigate);
  const onVisibleBoundsChangeRef = useRef(onVisibleBoundsChange);
  const selectedMarkerRef = useRef<any>(null);
  const propertyMarkersRef = useRef<Map<string, any>>(new Map());
  const listHoverPulseRef = useRef<any>(null);
  const propertiesRef = useRef(properties);
  const selectedPropertyIdRef = useRef(selectedPropertyId);
  const prevSelectedPropertyIdRef = useRef<string | null>(null);
  const boundsReportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  useKutaisiZonesMapLayer(
    mapInstanceRef.current,
    showKutaisiZones,
    ready,
    kutaisiZonesAutoFit
  );

  useTbilisiZonesMapLayer(
    mapInstanceRef.current,
    showTbilisiZones,
    ready,
    tbilisiZonesAutoFit
  );

  const propertyPath = (id: string) => `/property/${id}`;

  const defaultCenter = center || { lat: 42.1, lng: 43.5 };
  const defaultZoom = zoom || 7;

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    onPropertyMarkerClickRef.current = onPropertyMarkerClick;
  }, [onPropertyMarkerClick]);

  useEffect(() => {
    propertiesRef.current = properties;
  }, [properties]);

  useEffect(() => {
    selectedPropertyIdRef.current = selectedPropertyId;
  }, [selectedPropertyId]);

  useEffect(() => {
    onPropertyNavigateRef.current = onPropertyNavigate;
  }, [onPropertyNavigate]);

  useEffect(() => {
    onVisibleBoundsChangeRef.current = onVisibleBoundsChange;
  }, [onVisibleBoundsChange]);

  const reportVisibleBounds = () => {
    if (!onVisibleBoundsChangeRef.current) return;
    if (boundsReportTimerRef.current) clearTimeout(boundsReportTimerRef.current);
    boundsReportTimerRef.current = setTimeout(() => {
      boundsReportTimerRef.current = null;
      const map = mapInstanceRef.current;
      const cb = onVisibleBoundsChangeRef.current;
      if (!map || !cb) return;
      const b = map.getBounds();
      cb({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest()
      });
    }, 120);
  };

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
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
        if (active instanceof SVGElement && 'blur' in active) (active as SVGElement & { blur: () => void }).blur();
        if (onPickRef.current) {
          onPickRef.current(e.latlng.lat, e.latlng.lng);
        } else if (onPropertyMarkerClickRef.current) {
          onPropertyMarkerClickRef.current(null);
        }
      });

      if (onVisibleBoundsChangeRef.current) {
        const report = () => reportVisibleBounds();
        map.on('moveend', report);
        map.on('zoomend', report);
        map.whenReady(report);
      }

      mapInstanceRef.current = map;
      setReady(true);
    });

    return () => {
      if (boundsReportTimerRef.current) clearTimeout(boundsReportTimerRef.current);
      listHoverPulseRef.current = null;
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

      if (listHoverPulseRef.current) {
        map.removeLayer(listHoverPulseRef.current);
        listHoverPulseRef.current = null;
      }

      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && layer !== selectedMarkerRef.current) {
          map.removeLayer(layer);
        }
      });
      propertyMarkersRef.current.clear();

      const openOnNavigate = Boolean(onPropertyNavigateRef.current);

      properties.forEach((p) => {
        let marker: any;

        if (markerStyle === 'price') {
          const label = formatPriceLabel(p);
          const icon = L.divIcon({
            className: 'map-price-pin',
            html: `<div class="map-price-pin__inner">${label}</div>`,
            iconSize: [88, 28],
            iconAnchor: [44, 14]
          });
          marker = L.marker([p.location.lat, p.location.lng], { icon, zIndexOffset: 0 }).addTo(map);
        } else {
          const color = markerColors[p.type] || 'blue';
          const icon = createColoredIcon(color);
          marker = L.marker([p.location.lat, p.location.lng], { icon, zIndexOffset: 0 }).addTo(map);
        }

        const tooltipOffset: [number, number] = [0, markerStyle === 'price' ? -14 : -36];
        const richCardHtml = buildHoverTooltipHtml(p);

        propertyMarkersRef.current.set(p._id, marker);

        if (richHoverTooltips) {
          marker.bindTooltip(richCardHtml, {
            direction: 'top',
            offset: tooltipOffset,
            opacity: 1,
            sticky: true,
            interactive: true,
            permanent: false,
            className: 'map-property-tooltip'
          });

          let hoverClearTimer: ReturnType<typeof setTimeout> | null = null;

          const isPinnedSelection = () => p._id === selectedPropertyIdRef.current;

          const restorePinnedPopup = () => {
            const selId = selectedPropertyIdRef.current;
            if (!selId) return;
            const prop = propertiesRef.current.find((x) => x._id === selId);
            const selMarker = propertyMarkersRef.current.get(selId);
            if (prop && selMarker) openPinnedPropertyPopup(selMarker, prop);
          };

          const scheduleHoverClear = () => {
            if (isPinnedSelection()) return;
            if (hoverClearTimer) clearTimeout(hoverClearTimer);
            hoverClearTimer = setTimeout(() => {
              hoverClearTimer = null;
              if (!isPinnedSelection()) {
                marker.closeTooltip();
              }
              restorePinnedPopup();
            }, 140);
          };
          const cancelHoverClear = () => {
            if (hoverClearTimer) {
              clearTimeout(hoverClearTimer);
              hoverClearTimer = null;
            }
          };

          const pinSelection = () => {
            cancelHoverClear();
            selectedPropertyIdRef.current = p._id;
            openPinnedPropertyPopup(marker, p);
          };

          const bindPropertyCardLink = (root: HTMLElement, propertyId: string) => {
            const link = root.querySelector(
              '.map-property-card__link'
            ) as HTMLAnchorElement | null;
            if (!link || link.dataset.mapSelectBound === '1') return;
            link.dataset.mapSelectBound = '1';
            link.addEventListener('click', (ev) => {
              if (propertyId === selectedPropertyIdRef.current) return;
              ev.preventDefault();
              ev.stopPropagation();
              onPropertyMarkerClickRef.current?.(propertyId);
              if (propertyId === p._id) {
                pinSelection();
              } else {
                const other = propertyMarkersRef.current.get(propertyId);
                const otherProp = propertiesRef.current.find((x) => x._id === propertyId);
                if (other && otherProp) openPinnedPropertyPopup(other, otherProp);
              }
              selectedPropertyIdRef.current = propertyId;
            });
          };

          marker.on('mouseover', () => {
            cancelHoverClear();
            if (isPinnedSelection()) {
              restorePinnedPopup();
              return;
            }
            marker.openTooltip();
            restorePinnedPopup();
          });
          marker.on('mouseout', () => {
            if (isPinnedSelection()) return;
            scheduleHoverClear();
          });
          marker.on('tooltipopen', () => {
            const tip = marker.getTooltip()?.getElement?.() as HTMLElement | undefined;
            if (!tip) return;
            tip.addEventListener('mouseenter', cancelHoverClear);
            tip.addEventListener('mouseleave', () => {
              if (isPinnedSelection()) return;
              scheduleHoverClear();
            });
            bindPropertyCardLink(tip, p._id);
          });
          marker.on('popupopen', () => {
            const pop = marker.getPopup()?.getElement?.() as HTMLElement | undefined;
            if (!pop) return;
            bindPropertyCardLink(pop, p._id);
          });

          marker.on('click', (e: any) => {
            const target = e.originalEvent?.target as HTMLElement | undefined;
            if (target?.closest?.('.map-property-card__link')) {
              if (p._id !== selectedPropertyIdRef.current) {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                onPropertyMarkerClickRef.current?.(p._id);
                pinSelection();
              }
              return;
            }
            L.DomEvent.stopPropagation(e);
            onPropertyMarkerClickRef.current?.(p._id);
            pinSelection();
          });

          const el = marker.getElement?.() as HTMLElement | undefined;
          if (el) {
            const openInNewTab = (ev: MouseEvent) => {
              if (ev.button !== 1) return;
              ev.preventDefault();
              ev.stopPropagation();
              window.open(propertyPath(p._id), '_blank', 'noopener,noreferrer');
            };
            el.addEventListener('mousedown', openInNewTab);
            el.addEventListener('auxclick', openInNewTab);
          }
        } else if (openOnNavigate) {
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
      reportVisibleBounds();
    });
  }, [properties, ready, markerStyle, richHoverTooltips]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !richHoverTooltips) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      const selected = selectedPropertyId;
      const hovered = hoveredPropertyId;

      const prevSelected = prevSelectedPropertyIdRef.current;
      if (prevSelected && prevSelected !== selected) {
        const prevMarker = propertyMarkersRef.current.get(prevSelected);
        if (prevMarker) {
          closePinnedPropertyPopup(prevMarker);
          prevMarker.closeTooltip();
        }
      }
      prevSelectedPropertyIdRef.current = selected;

      propertyMarkersRef.current.forEach((marker, id) => {
        const isSelected = id === selected;
        const isListHover = Boolean(hovered && id === hovered);
        const el = marker.getElement?.() as HTMLElement | undefined;

        if (el) {
          el.classList.toggle('map-marker--selected', isSelected);
          el.classList.toggle('map-marker--list-hover', isListHover);
          if (markerStyle === 'price') {
            const inner = el.querySelector('.map-price-pin__inner');
            inner?.classList.toggle('map-price-pin__inner--selected', isSelected);
            inner?.classList.toggle('map-price-pin__inner--list-hover', isListHover);
          }
        }

        marker.setZIndexOffset(
          isListHover ? 650 : isSelected ? 800 : 0
        );

        if (isSelected) {
          const prop = propertiesRef.current.find((x) => x._id === id);
          if (prop) openPinnedPropertyPopup(marker, prop);
        } else {
          closePinnedPropertyPopup(marker);
          if (hovered && id === hovered) {
            marker.closeTooltip();
          } else if (!hovered) {
            marker.closeTooltip();
          }
        }
      });

      if (listHoverPulseRef.current) {
        map.removeLayer(listHoverPulseRef.current);
        listHoverPulseRef.current = null;
      }

      if (hovered) {
        const p = propertiesRef.current.find((x) => x._id === hovered);
        if (p?.location) {
          const ll = L.latLng(p.location.lat, p.location.lng);
          const pulseSize = 72;
          const pulseAnchor = pulseSize / 2;
          const pulseIcon = L.divIcon({
            className: 'map-location-pulse-wrap',
            html: `<div class="map-location-pulse" aria-hidden="true">
              <span class="map-location-pulse__ring"></span>
              <span class="map-location-pulse__ring map-location-pulse__ring--2"></span>
            </div>`,
            iconSize: [pulseSize, pulseSize],
            iconAnchor: [pulseAnchor, pulseAnchor]
          });
          listHoverPulseRef.current = L.marker(ll, {
            icon: pulseIcon,
            interactive: false,
            keyboard: false,
            zIndexOffset: 200
          }).addTo(map);

          if (!map.getBounds().pad(0.06).contains(ll)) {
            map.panTo(ll, { animate: true, duration: 0.35 });
          }
        }
      } else if (selected) {
        const p = propertiesRef.current.find((x) => x._id === selected);
        if (p?.location) {
          const ll = L.latLng(p.location.lat, p.location.lng);
          if (!map.getBounds().pad(0.06).contains(ll)) {
            map.panTo(ll, { animate: true, duration: 0.35 });
          }
        }
      }
    });
  }, [hoveredPropertyId, selectedPropertyId, ready, richHoverTooltips, markerStyle]);

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

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const mapEl = mapRef.current;
    const observer = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.invalidateSize();
    });
    observer.observe(mapEl);
    return () => observer.disconnect();
  }, [ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
