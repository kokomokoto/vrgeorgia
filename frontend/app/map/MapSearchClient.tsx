'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { listProperties } from '@/lib/api';
import type { Property } from '@/lib/types';
import { Filters, type FiltersState } from '@/components/Filters';
import { MapOverlaySearch } from '@/components/MapOverlaySearch';
import { MapView } from '@/components/MapView';
import { PropertyMapListRow } from '@/components/PropertyMapListRow';
import { PropertyMapListSkeleton } from '@/components/Skeleton';
import { filterPropertiesByMapBounds, mapBoundsEqual, type MapBounds } from '@/lib/mapBounds';
import { filtersToPropertyQuery, omitPriceAreaFilters, searchParamsToFiltersState } from '@/lib/mapQuery';
import { trackSearchFilters } from '@/lib/searchAnalytics';

const FILTERS_WIDTH_KEY = 'vhome-map-filters-width-v2';
const LIST_WIDTH_KEY = 'vhome-map-list-width-v2';
const FILTERS_WIDTH_KEY_V1 = 'vhome-map-filters-width';
const LIST_WIDTH_KEY_V1 = 'vhome-map-list-width';
const FILTERS_DEFAULT_W = 248;
const LIST_DEFAULT_W = 300;
const FILTERS_DEFAULT_W_V1 = 333;
const LIST_DEFAULT_W_V1 = 416;
const PANEL_MIN_W = 220;
const MAP_MIN_W = 320;
const COLLAPSED_W = 44;

function readStoredWidth(key: string, fallback: number, legacyKey: string, ignoreLegacy: number): number {
  if (typeof window === 'undefined') return fallback;
  const n = Number(window.localStorage.getItem(key));
  if (Number.isFinite(n) && n >= PANEL_MIN_W) return n;
  const legacy = Number(window.localStorage.getItem(legacyKey));
  if (Number.isFinite(legacy) && legacy >= PANEL_MIN_W && legacy !== ignoreLegacy) return legacy;
  return fallback;
}

function clampPanelWidth(width: number, otherWidth: number): number {
  const max = Math.max(PANEL_MIN_W, window.innerWidth - otherWidth - MAP_MIN_W);
  return Math.round(Math.min(max, Math.max(PANEL_MIN_W, width)));
}

function useLgViewport(): boolean {
  const [lg, setLg] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setLg(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return lg;
}

function PanelEdgeHandle({
  label,
  width,
  onWidth,
  onDragChange,
}: {
  label: string;
  width: number;
  onWidth: (next: number) => void;
  onDragChange: (dragging: boolean) => void;
}) {
  const dragRef = React.useRef<{ startX: number; startW: number } | null>(null);

  const endDrag = (el: HTMLElement, pointerId: number) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragChange(false);
    try {
      el.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
  };

  return (
    <div
      role="slider"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={PANEL_MIN_W}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      className="group absolute inset-y-0 right-0 z-40 hidden w-4 translate-x-1/2 cursor-ew-resize touch-none lg:block"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { startX: e.clientX, startW: width };
        onDragChange(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* pointer capture is optional */
        }
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        onWidth(drag.startW + (e.clientX - drag.startX));
      }}
      onPointerUp={(e) => endDrag(e.currentTarget, e.pointerId)}
      onPointerCancel={(e) => endDrag(e.currentTarget, e.pointerId)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        onWidth(width + (e.key === 'ArrowRight' ? 24 : -24));
      }}
    >
      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-300 group-hover:bg-blue-400 group-focus-visible:bg-blue-500 dark:bg-zinc-600" />
      <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-14 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md group-hover:border-blue-400 group-focus-visible:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900">
        <span className="h-6 w-0.5 rounded-full bg-slate-400 group-hover:bg-blue-500 group-focus-visible:bg-blue-500 dark:bg-zinc-400" />
      </span>
    </div>
  );
}

export default function MapSearchClient() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const spStr = searchParams.toString();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const tr = React.useCallback(
    (key: string, fallback: string) => {
      if (!mounted) return fallback;
      const translated = t(key);
      return !translated || translated === key ? fallback : translated;
    },
    [mounted, t]
  );

  const [filters, setFilters] = React.useState<FiltersState>(() =>
    searchParamsToFiltersState(new URLSearchParams(spStr)).filters
  );
  const [sortBy, setSortBy] = React.useState(() => searchParamsToFiltersState(new URLSearchParams(spStr)).sort);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [mapBounds, setMapBounds] = React.useState<MapBounds | null>(null);
  const [rangeProperties, setRangeProperties] = React.useState<Property[]>([]);
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const listInViewport = React.useMemo(() => {
    const inView = filterPropertiesByMapBounds(properties, mapBounds);
    if (selectedId && !inView.some((p) => p._id === selectedId)) {
      const selected = properties.find((p) => p._id === selectedId);
      if (selected) return [selected, ...inView];
    }
    return inView;
  }, [properties, mapBounds, selectedId]);

  const handleMapBoundsChange = React.useCallback((bounds: MapBounds) => {
    setMapBounds((prev) => (mapBoundsEqual(prev, bounds) ? prev : bounds));
  }, []);

  const handleMarkerClick = React.useCallback((id: string | null) => {
    setSelectedId(id);
    setHoveredId(null);
  }, []);

  const handlePropertyNavigate = React.useCallback(
    (id: string) => {
      router.push(`/property/${id}`);
    },
    [router]
  );

  React.useEffect(() => {
    const next = searchParamsToFiltersState(new URLSearchParams(spStr));
    setFilters(next.filters);
    setSortBy(next.sort);
  }, [spStr]);

  React.useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      listProperties({
        ...filtersToPropertyQuery(filters, sortBy, i18n.language),
        page: 1,
        limit: 5000,
      })
        .then((r) => {
          if (!alive) return;
          setProperties(r.properties);
          setSelectedId(null);
          setHoveredId(null);
          setMapBounds(null);
          trackSearchFilters('map', filters, { sort: sortBy, resultCount: r.total ?? r.properties.length });
        })
        .catch((e) => {
          if (!alive) return;
          setError(e.message || 'Error');
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
        });
    }, 350);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [filters, sortBy, i18n.language]);

  const rangeSourceKey = React.useMemo(
    () => JSON.stringify(omitPriceAreaFilters(filters)),
    [filters]
  );

  React.useEffect(() => {
    let alive = true;
    const rangeFilters = omitPriceAreaFilters(filters);
    listProperties({
      ...filtersToPropertyQuery(rangeFilters, 'date_desc', i18n.language),
      page: 1,
      limit: 5000,
    })
      .then((r) => {
        if (alive) setRangeProperties(r.properties);
      })
      .catch(() => {
        if (alive) setRangeProperties([]);
      });
    return () => {
      alive = false;
    };
  }, [rangeSourceKey, i18n.language]);

  const [filtersCollapsed, setFiltersCollapsed] = React.useState(false);
  const [listCollapsed, setListCollapsed] = React.useState(false);
  const isLg = useLgViewport();
  const [filtersWidth, setFiltersWidth] = React.useState(FILTERS_DEFAULT_W);
  const [listWidth, setListWidth] = React.useState(LIST_DEFAULT_W);
  const [widthsHydrated, setWidthsHydrated] = React.useState(false);
  const [filtersDragging, setFiltersDragging] = React.useState(false);
  const [listDragging, setListDragging] = React.useState(false);
  const panelRef = React.useRef({
    filters: FILTERS_DEFAULT_W,
    list: LIST_DEFAULT_W,
    filtersCollapsed: false,
    listCollapsed: false,
  });
  panelRef.current = {
    filters: filtersWidth,
    list: listWidth,
    filtersCollapsed,
    listCollapsed,
  };

  React.useEffect(() => {
    setFiltersWidth(readStoredWidth(FILTERS_WIDTH_KEY, FILTERS_DEFAULT_W, FILTERS_WIDTH_KEY_V1, FILTERS_DEFAULT_W_V1));
    setListWidth(readStoredWidth(LIST_WIDTH_KEY, LIST_DEFAULT_W, LIST_WIDTH_KEY_V1, LIST_DEFAULT_W_V1));
    setWidthsHydrated(true);
  }, []);

  const otherWidth = React.useCallback((which: 'filters' | 'list') => {
    const s = panelRef.current;
    if (which === 'filters') return s.listCollapsed ? COLLAPSED_W : s.list;
    return s.filtersCollapsed ? COLLAPSED_W : s.filters;
  }, []);

  const applyFiltersWidth = React.useCallback(
    (next: number) => {
      const width = clampPanelWidth(next, otherWidth('filters'));
      setFiltersWidth(width);
      panelRef.current.filters = width;
    },
    [otherWidth]
  );

  const applyListWidth = React.useCallback(
    (next: number) => {
      const width = clampPanelWidth(next, otherWidth('list'));
      setListWidth(width);
      panelRef.current.list = width;
    },
    [otherWidth]
  );

  React.useEffect(() => {
    if (!widthsHydrated || filtersDragging || listDragging) return;
    try {
      window.localStorage.setItem(FILTERS_WIDTH_KEY, String(filtersWidth));
      window.localStorage.setItem(LIST_WIDTH_KEY, String(listWidth));
    } catch {
      /* ignore */
    }
  }, [filtersWidth, listWidth, widthsHydrated, filtersDragging, listDragging]);

  React.useEffect(() => {
    const dragging = filtersDragging || listDragging;
    if (!dragging) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [filtersDragging, listDragging]);

  React.useEffect(() => {
    const onResize = () => {
      setFiltersWidth((w) => clampPanelWidth(w, otherWidth('filters')));
      setListWidth((w) => clampPanelWidth(w, otherWidth('list')));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [otherWidth]);

  const openPanelStyle = (width: number): React.CSSProperties | undefined =>
    isLg ? { width, maxWidth: width, flex: '0 0 auto' } : undefined;

  React.useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50 dark:bg-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className={`relative z-20 flex shrink-0 flex-col border-b border-slate-200 bg-white transition-[max-height] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:h-full lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r ${
            filtersDragging ? '' : 'lg:transition-[width]'
          } ${
            filtersCollapsed
              ? 'max-h-12 lg:w-11 lg:max-w-11'
              : 'max-h-[min(62vh,560px)] lg:max-h-none'
          }`}
          style={filtersCollapsed ? undefined : openPanelStyle(filtersWidth)}
        >
          {filtersCollapsed ? (
            <button
              type="button"
              onClick={() => setFiltersCollapsed(false)}
              className="flex h-12 w-full items-center justify-center gap-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-900 lg:h-full lg:flex-col lg:gap-3 lg:px-1.5 lg:py-4"
              aria-label={tr('map_expand_filters', 'ფილტრების გახსნა')}
              title={tr('map_expand_filters', 'ფილტრების გახსნა')}
            >
              <svg className="h-5 w-5 shrink-0 rotate-180 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="lg:writing-mode-vertical truncate text-xs tracking-wide lg:[writing-mode:vertical-rl] lg:rotate-180">
                {tr('map_filters_panel', 'ფილტრები')}
              </span>
            </button>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  aria-label={tr('map_back', 'უკან')}
                  title={tr('map_back', 'უკან')}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>{tr('map_back', 'უკან')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersCollapsed(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label={tr('map_collapse_filters', 'ფილტრების შეკეცვა')}
                  title={tr('map_collapse_filters', 'ფილტრების შეკეცვა')}
                >
                  <svg className="h-4 w-4 rotate-90 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <Filters variant="mapSidebar" value={filters} onChange={setFilters} rangeProperties={rangeProperties} />
              </div>
            </>
          )}
          {!filtersCollapsed ? (
            <PanelEdgeHandle
              label={tr('map_resize_filters', 'ფილტრების სიგანე')}
              width={filtersWidth}
              onWidth={applyFiltersWidth}
              onDragChange={setFiltersDragging}
            />
          ) : null}
        </aside>

        <section
          className={`relative z-10 flex min-h-0 min-w-0 flex-col border-b border-slate-200 bg-slate-50 transition-[max-height] duration-200 dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r ${
            listDragging ? '' : 'lg:transition-[width]'
          } ${
            listCollapsed
              ? 'max-h-12 shrink-0 lg:w-11 lg:max-w-11 lg:flex-none'
              : 'max-lg:flex-1'
          }`}
          style={listCollapsed ? undefined : openPanelStyle(listWidth)}
        >
          {listCollapsed ? (
            <button
              type="button"
              onClick={() => setListCollapsed(false)}
              className="flex h-12 w-full items-center justify-center gap-2 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:h-full lg:flex-col lg:gap-3 lg:px-1.5 lg:py-4"
              aria-label={tr('map_expand_list', 'სიის გახსნა')}
              title={tr('map_expand_list', 'სიის გახსნა')}
            >
              <svg className="h-5 w-5 shrink-0 rotate-180 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="lg:writing-mode-vertical truncate text-xs tracking-wide lg:[writing-mode:vertical-rl] lg:rotate-180">
                {tr('map_list_panel', 'სია')}
              </span>
            </button>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                <span className="text-xs text-slate-600 dark:text-zinc-400">
                  {loading
                    ? '…'
                    : mapBounds
                      ? `${listInViewport.length} / ${properties.length} ${tr('objects_on_map', 'რუკაზე')}`
                      : `${properties.length} ${tr('objects', 'ობიექტი')}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    className="max-w-[11rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date_desc">{tr('sort_date_desc', '📅 ახალი → ძველი')}</option>
                    <option value="date_asc">{tr('sort_date_asc', '📅 ძველი → ახალი')}</option>
                    <option value="price_asc">{tr('sort_price_asc', '💰 ფასი ↑')}</option>
                    <option value="price_desc">{tr('sort_price_desc', '💰 ფასი ↓')}</option>
                    <option value="area_asc">{tr('sort_area_asc', '📐 ფართობი ↑')}</option>
                    <option value="area_desc">{tr('sort_area_desc', '📐 ფართობი ↓')}</option>
                    <option value="views_desc">{tr('sort_views_desc', '👁️ ნახვები ↓')}</option>
                    <option value="views_asc">{tr('sort_views_asc', '👁️ ნახვები ↑')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setListCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label={tr('map_collapse_list', 'სიის შეკეცვა')}
                    title={tr('map_collapse_list', 'სიის შეკეცვა')}
                  >
                    <svg className="h-4 w-4 rotate-90 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </div>
                )}
                {loading ? (
                  <PropertyMapListSkeleton count={6} />
                ) : properties.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">{tr('noProperties', 'განცხადებები ვერ მოიძებნა')}</p>
                ) : listInViewport.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    {tr('no_objects_in_map_view', 'ამ რუკის ხედში განცხადება ვერ მოიძებნა. გადაიწიეთ ან გაადიდეთ რუკა.')}
                  </p>
                ) : (
                  listInViewport.map((p) => (
                    <PropertyMapListRow
                      key={p._id}
                      p={p}
                      selected={selectedId === p._id}
                      highlighted={hoveredId === p._id}
                      onHover={() => setHoveredId(p._id)}
                      onHoverEnd={() => {
                        setHoveredId((prev) => (prev === p._id ? null : prev));
                      }}
                      rowRef={(el) => {
                        rowRefs.current[p._id] = el;
                      }}
                    />
                  ))
                )}
              </div>
            </>
          )}
          {!listCollapsed ? (
            <PanelEdgeHandle
              label={tr('map_resize_list', 'სიის სიგანე')}
              width={listWidth}
              onWidth={applyListWidth}
              onDragChange={setListDragging}
            />
          ) : null}
        </section>

        <div className="relative z-0 flex min-h-[min(42vh,320px)] min-w-0 flex-1 flex-col lg:min-h-0">
          <div className="pointer-events-none absolute left-3 top-3 z-[500] sm:left-14">
            <div className="pointer-events-auto">
              <MapOverlaySearch filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-zinc-900 dark:text-amber-400 dark:ring-zinc-600 dark:hover:bg-zinc-800"
            aria-label={tr('map_close_full', 'რუკის დახურვა')}
          >
            <span aria-hidden>✕</span>
            <span className="hidden sm:inline">{tr('map_close_full', 'რუკის დახურვა')}</span>
          </button>
          <MapView
            properties={properties}
            selectedPropertyId={selectedId}
            hoveredPropertyId={hoveredId}
            onPropertyMarkerClick={handleMarkerClick}
            richHoverTooltips
            onPropertyNavigate={handlePropertyNavigate}
            onVisibleBoundsChange={handleMapBoundsChange}
            heightClassName="h-full min-h-[min(42vh,320px)] lg:min-h-0"
            className="rounded-none border-0 lg:h-full"
          />
        </div>
      </div>
    </div>
  );
}
