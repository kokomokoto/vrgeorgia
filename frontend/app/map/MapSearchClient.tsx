'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { listProperties } from '@/lib/api';
import type { Property } from '@/lib/types';
import { Filters, type FiltersState } from '@/components/Filters';
import { MapView } from '@/components/MapView';
import { PropertyMapListRow } from '@/components/PropertyMapListRow';
import { searchParamsToFiltersState } from '@/lib/mapQuery';

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
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    const next = searchParamsToFiltersState(new URLSearchParams(spStr));
    setFilters(next.filters);
    setSortBy(next.sort);
  }, [spStr]);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    listProperties({
      ...filters,
      sort: sortBy,
      lang: i18n.language
    })
      .then((r) => {
        if (!alive) return;
        setProperties(r.properties);
        setSelectedId(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Error');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filters, sortBy, i18n.language]);

  React.useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-50 dark:bg-zinc-950">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          href="/"
          className="text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-amber-400"
        >
          ← {tr('browseProperties', 'განცხადებების ნახვა')}
        </Link>
        <span className="truncate px-2 text-center text-sm font-semibold text-slate-900 dark:text-amber-400">
          {tr('map_full_view_title', 'ძიება რუკაზე')}
        </span>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          aria-label={tr('map_close_full', 'დახურვა')}
        >
          ✕
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="max-h-[min(50vh,420px)] shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 lg:h-full lg:max-h-none lg:min-h-0 lg:w-[min(26rem,92vw)] lg:max-w-md lg:shrink-0 lg:border-b-0 lg:border-r">
          <Filters variant="mapSidebar" value={filters} onChange={setFilters} />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 lg:flex-none lg:w-[min(26rem,36vw)] lg:max-w-md lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-xs text-slate-600 dark:text-zinc-400">
              {loading ? '…' : `${properties.length} ${tr('objects', 'ობიექტი')}`}
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
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}
            {loading && <p className="text-sm text-slate-500 dark:text-zinc-400">{tr('loading', 'იტვირთება...')}</p>}
            {!loading && properties.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-zinc-400">{tr('noProperties', 'თქვენ ჯერ არ გაქვთ განცხადებები')}</p>
            )}
            {!loading &&
              properties.map((p) => (
                <PropertyMapListRow
                  key={p._id}
                  p={p}
                  selected={selectedId === p._id}
                  onSelect={() => setSelectedId(p._id)}
                  rowRef={(el) => {
                    rowRefs.current[p._id] = el;
                  }}
                />
              ))}
          </div>
        </section>

        <div className="flex min-h-[min(42vh,320px)] min-w-0 flex-1 flex-col lg:min-h-0">
          <MapView
            properties={properties}
            selectedPropertyId={selectedId}
            onPropertyMarkerClick={(id) => setSelectedId(id)}
            richHoverTooltips
            onPropertyNavigate={(id) => router.push(`/property/${id}`)}
            heightClassName="h-full min-h-[min(42vh,320px)] lg:min-h-0"
            className="rounded-none border-0 lg:h-full"
          />
        </div>
      </div>
    </div>
  );
}
