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
import { filterPropertiesByMapBounds, mapBoundsEqual, type MapBounds } from '@/lib/mapBounds';
import { filtersToPropertyQuery, omitPriceAreaFilters, searchParamsToFiltersState } from '@/lib/mapQuery';

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
      listProperties(filtersToPropertyQuery(filters, sortBy, i18n.language))
        .then((r) => {
          if (!alive) return;
          setProperties(r.properties);
          setSelectedId(null);
          setHoveredId(null);
          setMapBounds(null);
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
    listProperties(filtersToPropertyQuery(rangeFilters, 'date_desc', i18n.language))
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

  React.useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50 dark:bg-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="max-h-[min(50vh,420px)] shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 lg:h-full lg:max-h-none lg:min-h-0 lg:w-[min(26rem,92vw)] lg:max-w-md lg:shrink-0 lg:border-b-0 lg:border-r">
          <Filters variant="mapSidebar" value={filters} onChange={setFilters} rangeProperties={rangeProperties} />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 lg:flex-none lg:w-[min(26rem,36vw)] lg:max-w-md lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-xs text-slate-600 dark:text-zinc-400">
              {loading
                ? '…'
                : mapBounds
                  ? `${listInViewport.length} / ${properties.length} ${tr('objects_on_map', 'რუკაზე')}`
                  : `${properties.length} ${tr('objects', 'ობიექტი')}`}
            </span>
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
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}
            {loading && <p className="text-sm text-slate-500 dark:text-zinc-400">{tr('loading', 'იტვირთება...')}</p>}
            {!loading && properties.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-zinc-400">{tr('noProperties', 'თქვენ ჯერ არ გაქვთ განცხადებები')}</p>
            )}
            {!loading && properties.length > 0 && listInViewport.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {tr('no_objects_in_map_view', 'ამ რუკის ხედში განცხადება ვერ მოიძებნა. გადაიწიეთ ან გაადიდეთ რუკა.')}
              </p>
            )}
            {!loading &&
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
              ))}
          </div>
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
