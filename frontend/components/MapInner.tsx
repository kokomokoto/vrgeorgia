'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/lib/types';
import { resolveImageUrl } from '@/lib/api';
import { isPanoramaPhoto } from '@/lib/panorama';
import type { MapBounds } from '@/lib/mapBounds';
import { useTheme } from '@/components/ThemeProvider';
import { useKutaisiZonesMapLayer } from '@/components/KutaisiZonesMapLayer';
import { useTbilisiZonesMapLayer } from '@/components/TbilisiZonesMapLayer';
import {
  resolveMapTileConfig,
  type MapTileStyle,
} from '@/lib/themePalettes';
import { propertyHref } from '@/lib/propertyPublicPath';

const MAP_BASEMAP_CLASSES = ['map-basemap--dark', 'map-basemap--positron'] as const;
const PROPERTY_MARKER_ZOOM = 16;

function applyMapBasemapClass(el: HTMLElement | null, paneClass: 'dark' | 'positron' | null) {
  if (!el) return;
  el.classList.remove(...MAP_BASEMAP_CLASSES);
  if (paneClass) el.classList.add(`map-basemap--${paneClass}`);
}

function currentMapTileStyle(): MapTileStyle {
  const raw = typeof document !== 'undefined' ? document.documentElement.dataset.mapTiles : undefined;
  if (
    raw === 'auto' ||
    raw === 'light' ||
    raw === 'dark' ||
    raw === 'voyager' ||
    raw === 'positron'
  ) {
    return raw;
  }
  return 'auto';
}

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
  const href = propertyHref(p);
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
  autoPan: false,
  keepInView: false,
  className: 'map-property-popup map-property-tooltip'
};

function closePinnedPropertyPopup(marker: any) {
  marker.closePopup?.();
}

type LeafletNS = typeof import('leaflet');

function unwrapLeaflet(mod: LeafletNS | { default: LeafletNS }): LeafletNS {
  return ((mod as { default?: LeafletNS }).default ?? mod) as LeafletNS;
}

async function loadLeaflet(): Promise<LeafletNS> {
  return unwrapLeaflet(await import('leaflet'));
}

async function loadLeafletWithCluster(): Promise<LeafletNS> {
  const L = await loadLeaflet();
  if (typeof window !== 'undefined') {
    (window as unknown as { L: LeafletNS }).L = L;
  }
  const clusterMod = (await import('leaflet.markercluster')) as {
    MarkerClusterGroup?: new (options?: object) => unknown;
    default?: { MarkerClusterGroup?: new (options?: object) => unknown };
  };
  const MarkerClusterGroup =
    clusterMod.MarkerClusterGroup ||
    clusterMod.default?.MarkerClusterGroup ||
    (L as { MarkerClusterGroup?: new (options?: object) => unknown }).MarkerClusterGroup;
  if (typeof MarkerClusterGroup !== 'function') {
    throw new Error('leaflet.markercluster failed to load MarkerClusterGroup');
  }
  const leafletAny = L as any;
  leafletAny.MarkerClusterGroup = MarkerClusterGroup;
  leafletAny.markerClusterGroup = (options?: object) => new MarkerClusterGroup(options);
  return L as LeafletNS;
}

function createPropertyClusterGroup(L: LeafletNS) {
  const clusterGroup = (L as LeafletNS & { markerClusterGroup: (options: object) => any }).markerClusterGroup;
  return clusterGroup({
    chunkedLoading: true,
    chunkDelay: 20,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: PROPERTY_MARKER_ZOOM,
    maxClusterRadius: (zoom: number) => {
      if (zoom <= 7) return 92;
      if (zoom <= 10) return 72;
      if (zoom <= 13) return 52;
      return 40;
    },
    animate: true,
    animateAddingMarkers: false,
    iconCreateFunction: (cluster) => {
      const n = cluster.getChildCount();
      const sizeClass = n >= 100 ? 'lg' : n >= 25 ? 'md' : 'sm';
      const px = n >= 100 ? 52 : n >= 25 ? 44 : 36;
      return L.divIcon({
        html: `<div class="map-cluster map-cluster--${sizeClass}"><span>${n}</span></div>`,
        className: 'map-cluster-icon',
        iconSize: [px, px],
        iconAnchor: [Math.round(px / 2), Math.round(px / 2)],
      });
    },
  });
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
  /** სიიდან პირველი დაჭერა — ამ nonce-ზე რუკა ობიექტთან მიახლოვდება */
  listFocusId?: string | null;
  listFocusNonce?: number;
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
  listFocusId = null,
  listFocusNonce = 0,
  onPropertyMarkerClick,
  richHoverTooltips = false,
  onPropertyNavigate,
  onVisibleBoundsChange,
  showKutaisiZones = false,
  kutaisiZonesAutoFit = true,
  showTbilisiZones = false,
  tbilisiZonesAutoFit = true
}: MapInnerProps) {
  const { t } = useTranslation();
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
  const clusterGroupRef = useRef<any>(null);
  const listHoverPulseRef = useRef<any>(null);
  const listHoverClusterRef = useRef<HTMLElement | null>(null);
  const listHoverLockRef = useRef(false);
  const hoverGenRef = useRef(0);
  const propertiesRef = useRef(properties);
  const selectedPropertyIdRef = useRef(selectedPropertyId);
  const prevSelectedPropertyIdRef = useRef<string | null>(null);
  const pinnedPopupRef = useRef<any>(null);
  const ignorePopupCloseRef = useRef(false);
  const markerStyleRef = useRef(markerStyle);
  const boundsReportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  markerStyleRef.current = markerStyle;

  const openPinnedCardRef = useRef<(prop: Property) => void>(() => {});
  openPinnedCardRef.current = (prop: Property) => {
    const map = mapInstanceRef.current;
    const lat = prop.location?.lat;
    const lng = prop.location?.lng;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    void loadLeaflet().then((L) => {
      if (mapInstanceRef.current !== map) return;
      const html = buildHoverTooltipHtml(prop);
      const latlng = L.latLng(lat, lng);
      const offset: [number, number] = markerStyleRef.current === 'price' ? [0, -16] : [0, -36];
      let popup = pinnedPopupRef.current;
      if (!popup) {
        popup = L.popup({ ...PINNED_POPUP_OPTIONS, offset });
        pinnedPopupRef.current = popup;
      } else if (popup.options) {
        popup.options.offset = L.point(offset[0], offset[1]);
      }
      popup.setLatLng(latlng);
      popup.setContent(html);
      if (!map.hasLayer(popup)) popup.openOn(map);
      propertyMarkersRef.current.get(prop._id)?.closeTooltip?.();
      const root = popup.getElement?.() as HTMLElement | undefined;
      const link = root?.querySelector('.map-property-card__link') as HTMLAnchorElement | null;
      if (link && link.dataset.mapPinnedBound !== '1') {
        link.dataset.mapPinnedBound = '1';
        link.addEventListener('click', (ev) => {
          if (prop._id === selectedPropertyIdRef.current) return;
          ev.preventDefault();
          ev.stopPropagation();
          selectedPropertyIdRef.current = prop._id;
          onPropertyMarkerClickRef.current?.(prop._id);
        });
      }
    });
  };

  const closePinnedCard = () => {
    const map = mapInstanceRef.current;
    const popup = pinnedPopupRef.current;
    if (!map || !popup) return;
    ignorePopupCloseRef.current = true;
    map.closePopup(popup);
    ignorePopupCloseRef.current = false;
    pinnedPopupRef.current = null;
  };
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

  const propertyPath = (p: { _id: string; urlKey?: string }) => propertyHref(p);

  const defaultCenter = center || { lat: 42.4, lng: 43.5 };
  const defaultZoom = zoom || 8;

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
    if (listHoverLockRef.current) return;
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
    let cancelled = false;
    let createdMap: any = null;

    const initMap = async () => {
      const L = await loadLeaflet();
      if (cancelled || mapInstanceRef.current) return;

      const container = mapRef.current;
      if (!container || !container.isConnected) return;
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        delete (container as HTMLElement & { _leaflet_id?: number })._leaflet_id;
      }

      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const map = L.map(container).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
      if (cancelled) {
        map.remove();
        return;
      }
      createdMap = map;

      const initialTiles = resolveMapTileConfig(
        currentMapTileStyle(),
        document.documentElement.classList.contains('dark')
      );
      applyMapBasemapClass(container, initialTiles.paneClass);
      const tl = L.tileLayer(initialTiles.url, { attribution: initialTiles.attribution }).addTo(map);
      tileLayerRef.current = tl;

      map.on('click', (e: any) => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
        if (active instanceof SVGElement && 'blur' in active) (active as SVGElement & { blur: () => void }).blur();
        if (onPickRef.current) {
          onPickRef.current(e.latlng.lat, e.latlng.lng);
        }
      });

      map.on('popupclose', (e: any) => {
        if (e.popup !== pinnedPopupRef.current) return;
        pinnedPopupRef.current = null;
        if (ignorePopupCloseRef.current) return;
        if (!selectedPropertyIdRef.current) return;
        selectedPropertyIdRef.current = null;
        onPropertyMarkerClickRef.current?.(null);
      });

      if (onVisibleBoundsChangeRef.current) {
        const report = () => reportVisibleBounds();
        map.on('moveend', report);
        map.on('zoomend', report);
        map.whenReady(report);
      }

      mapInstanceRef.current = map;
      setReady(true);
    };

    void initMap();

    return () => {
      cancelled = true;
      if (boundsReportTimerRef.current) clearTimeout(boundsReportTimerRef.current);
      listHoverPulseRef.current = null;
      const map = createdMap || mapInstanceRef.current;
      if (map) {
        map.remove();
      }
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      clusterGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const applyTiles = () => {
      const tl = tileLayerRef.current;
      if (!tl || typeof tl.setUrl !== 'function') return;
      const cfg = resolveMapTileConfig(currentMapTileStyle(), isDark);
      applyMapBasemapClass(mapInstanceRef.current?.getContainer?.() ?? mapRef.current, cfg.paneClass);
      tl.setUrl(cfg.url);
      if (typeof tl.options !== 'undefined') tl.options.attribution = cfg.attribution;
      tl.redraw?.();
    };
    applyTiles();
    window.addEventListener('theme-palette-changed', applyTiles);
    return () => window.removeEventListener('theme-palette-changed', applyTiles);
  }, [isDark]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready) return;
    let cancelled = false;

    void loadLeafletWithCluster().then((L) => {
      if (cancelled) return;
      const map = mapInstanceRef.current;
      if (!map) return;

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
      listHoverClusterRef.current?.classList.remove('map-cluster-icon--list-target');
      listHoverClusterRef.current = null;

      let clusterGroup = clusterGroupRef.current;
      if (!clusterGroup || !map.hasLayer(clusterGroup)) {
        clusterGroup = createPropertyClusterGroup(L);
        clusterGroupRef.current = clusterGroup;
        map.addLayer(clusterGroup);
      } else {
        clusterGroup.clearLayers();
      }
      propertyMarkersRef.current.clear();

      const openOnNavigate = Boolean(onPropertyNavigateRef.current);

      properties.forEach((p) => {
        const lat = p.location?.lat;
        const lng = p.location?.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        let marker: any;

        if (markerStyle === 'price') {
          const label = formatPriceLabel(p);
          const icon = L.divIcon({
            className: 'map-price-pin',
            html: `<div class="map-price-pin__inner">${label}</div>`,
            iconSize: [88, 28],
            iconAnchor: [44, 14]
          });
          marker = L.marker([p.location.lat, p.location.lng], { icon, zIndexOffset: 0 });
        } else {
          const color = markerColors[p.type] || 'blue';
          const icon = createColoredIcon(color);
          marker = L.marker([p.location.lat, p.location.lng], { icon, zIndexOffset: 0 });
        }

        const tooltipOffset: [number, number] = [0, markerStyle === 'price' ? -14 : -36];
        const richCardHtml = buildHoverTooltipHtml(p);

        propertyMarkersRef.current.set(p._id, marker);
        clusterGroup.addLayer(marker);

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

          const scheduleHoverClear = () => {
            if (isPinnedSelection()) return;
            if (hoverClearTimer) clearTimeout(hoverClearTimer);
            hoverClearTimer = setTimeout(() => {
              hoverClearTimer = null;
              if (!isPinnedSelection()) marker.closeTooltip();
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
            marker.closeTooltip();
            openPinnedCardRef.current(p);
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
                const otherProp = propertiesRef.current.find((x) => x._id === propertyId);
                if (otherProp) openPinnedCardRef.current(otherProp);
              }
              selectedPropertyIdRef.current = propertyId;
            });
          };

          marker.on('mouseover', () => {
            cancelHoverClear();
            if (isPinnedSelection()) {
              marker.closeTooltip();
              return;
            }
            marker.openTooltip();
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
            if (p._id === selectedPropertyIdRef.current) {
              if (onPropertyNavigateRef.current) {
                onPropertyNavigateRef.current(p.urlKey || p._id);
              } else {
                window.location.assign(propertyPath(p));
              }
              return;
            }
            onPropertyMarkerClickRef.current?.(p._id);
            pinSelection();
          });

          const el = marker.getElement?.() as HTMLElement | undefined;
          if (el) {
            const openInNewTab = (ev: MouseEvent) => {
              if (ev.button !== 1) return;
              ev.preventDefault();
              ev.stopPropagation();
              window.open(propertyPath(p), '_blank', 'noopener,noreferrer');
            };
            el.addEventListener('mousedown', openInNewTab);
            el.addEventListener('auxclick', openInNewTab);
          }
        } else if (openOnNavigate) {
          const el = marker.getElement?.() as HTMLElement | undefined;
          if (el) el.style.cursor = 'pointer';
          marker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            onPropertyNavigateRef.current?.(p.urlKey || p._id);
          });
        } else {
          marker.bindPopup(`
          <div style="min-width: 150px;">
            <a href="${propertyHref(p)}" style="font-size: 14px; font-weight: 600; color: #1e40af; text-decoration: none; display: block; margin-bottom: 4px;">
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
    return () => {
      cancelled = true;
    };
  }, [properties, ready, markerStyle, richHoverTooltips]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !richHoverTooltips) return;
    const gen = ++hoverGenRef.current;
    const hoveredNow = hoveredPropertyId;
    if (hoveredNow) {
      listHoverLockRef.current = true;
    } else if (listHoverLockRef.current) {
      listHoverLockRef.current = false;
      reportVisibleBounds();
    }

    loadLeaflet().then((L) => {
      if (gen !== hoverGenRef.current) return;
      const map = mapInstanceRef.current;
      if (!map) return;
      const selected = selectedPropertyId;
      const hovered = hoveredNow;

      const prevSelected = prevSelectedPropertyIdRef.current;
      if (prevSelected && prevSelected !== selected) {
        propertyMarkersRef.current.get(prevSelected)?.closeTooltip?.();
      }
      prevSelectedPropertyIdRef.current = selected;
      if (!selected && prevSelected) {
        closePinnedCard();
      } else if (selected && selected !== prevSelected) {
        const picked = propertiesRef.current.find((x) => x._id === selected);
        if (picked) openPinnedCardRef.current(picked);
      }

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

        if (!isSelected) {
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
      listHoverClusterRef.current?.classList.remove('map-cluster-icon--list-target');
      listHoverClusterRef.current = null;

      if (hovered) {
        const p = propertiesRef.current.find((x) => x._id === hovered);
        const lat = p?.location?.lat;
        const lng = p?.location?.lng;
        if (p && Number.isFinite(lat) && Number.isFinite(lng)) {
          const ll = L.latLng(lat as number, lng as number);
          const marker = propertyMarkersRef.current.get(hovered);
          let parent = marker?.__parent;
          let clusterIcon: HTMLElement | null = null;
          while (parent) {
            if (parent._icon) clusterIcon = parent._icon as HTMLElement;
            parent = parent.__parent;
          }
          if (clusterIcon) {
            clusterIcon.classList.add('map-cluster-icon--list-target');
            listHoverClusterRef.current = clusterIcon;
          }

          if (!map.getPane('listHoverPane')) {
            const pane = map.createPane('listHoverPane');
            pane.style.zIndex = '650';
            pane.style.pointerEvents = 'none';
          }
          const beaconIcon = L.divIcon({
            className: 'map-list-beacon-wrap',
            html: `<div class="map-list-beacon" aria-hidden="true">
              <span class="map-list-beacon__ring"></span>
              <span class="map-list-beacon__ring map-list-beacon__ring--2"></span>
              <span class="map-list-beacon__dot"></span>
            </div>`,
            iconSize: [88, 88],
            iconAnchor: [44, 44]
          });
          listHoverPulseRef.current = L.marker(ll, {
            pane: 'listHoverPane',
            icon: beaconIcon,
            interactive: false,
            keyboard: false,
            zIndexOffset: 900
          }).addTo(map);
        }
      }
    });
  }, [hoveredPropertyId, selectedPropertyId, ready, richHoverTooltips, markerStyle]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !listFocusNonce || !listFocusId) return;
    const id = listFocusId;
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled) return;
      const map = mapInstanceRef.current;
      if (!map) return;
      const picked = propertiesRef.current.find((item) => item._id === id);
      const lat = picked?.location?.lat;
      const lng = picked?.location?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const zoom = Math.max(map.getZoom(), PROPERTY_MARKER_ZOOM);
      map.flyTo(L.latLng(lat as number, lng as number), zoom, { animate: true, duration: 0.7 });
    });
    return () => {
      cancelled = true;
    };
  }, [listFocusId, listFocusNonce, ready]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready) return;

    loadLeaflet().then((L) => {
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
        selectedMarkerRef.current.bindPopup(t('selected_location')).openPopup();
      }
    });
  }, [selectedLocation, ready, t]);

  useEffect(() => {
    if (!mapInstanceRef.current || !ready || !center) return;
    mapInstanceRef.current.setView([center.lat, center.lng], zoom || 17);
  }, [center, zoom, ready]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const mapEl = mapRef.current;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.invalidateSize({ animate: false });
      });
    };
    const observer = new ResizeObserver(bump);
    observer.observe(mapEl);
    // Design Mode resize / parent size ცვლილება
    if (mapEl.parentElement) observer.observe(mapEl.parentElement);
    bump();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
