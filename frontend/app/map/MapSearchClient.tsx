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

export default function MapSearchClient() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const spStr = searchParams.toString();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const tr = React.useCallback(
    (key: string, fallback: string) => (mounted ? t(key) : fallback),
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

  React.useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50 dark:bg-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className={`relative flex shrink-0 flex-col border-b border-slate-200 bg-white transition-[width,max-height] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:h-full lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r ${
            filtersCollapsed
              ? 'max-h-12 lg:w-11 lg:max-w-11'
              : 'max-h-[min(50vh,420px)] lg:w-[min(20.8rem,74vw)] lg:max-w-[20.8rem]'
          }`}
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
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
        </aside>

        <section
          className={`relative flex min-h-0 min-w-0 flex-col border-b border-slate-200 bg-slate-50 transition-[width,max-height] duration-200 dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r ${
            listCollapsed
              ? 'max-h-12 shrink-0 lg:w-11 lg:max-w-11 lg:flex-none'
              : 'flex-1 lg:flex-none lg:w-[min(26rem,36vw)] lg:max-w-md'
          }`}
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
        </section>

        <div className="relative flex min-h-[min(42vh,320px)] min-w-0 flex-1 flex-col lg:min-h-0">
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
