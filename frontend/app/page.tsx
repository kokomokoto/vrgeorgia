'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { listProperties } from '@/lib/api';
import { apiLang } from '@/lib/apiLang';
import { buildMapHref, filtersToPropertyQuery } from '@/lib/mapQuery';
import type { Property } from '@/lib/types';
import { Filters, type FiltersState } from '@/components/Filters';
import {
  clearHomeFiltersStorage,
  HOME_FILTERS_INITIAL,
} from '@/lib/homeFiltersStorage';
import { MapView } from '@/components/MapView';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyCardGridSkeleton } from '@/components/Skeleton';
import { trackSearchFilters } from '@/lib/searchAnalytics';
import { LAND_STATUS_OPTIONS } from '@/lib/propertyTypeUi';

// კატეგორიები იკონებით
const PROPERTY_CATEGORIES = [
  { value: 'apartment', key: 'apartment', icon: '🏢' },
  { value: 'house', key: 'house', icon: '🏠' },
  { value: 'commercial', key: 'commercial', icon: '🏪' },
  { value: 'land', key: 'land', icon: '🌍' },
  { value: 'cottage', key: 'cottage', icon: '🏡' },
  { value: 'hotel', key: 'hotel', icon: '🏨' },
  { value: 'building', key: 'building', icon: '🏗️' },
  { value: 'warehouse', key: 'warehouse', icon: '📦' },
  { value: 'parking', key: 'parking', icon: '🚗' },
  { value: 'business', key: 'business', icon: '💼' },
];

function togglePropertyType(prev: FiltersState, catValue: string, isSelected: boolean): FiltersState {
  const nextType = isSelected
    ? prev.type.filter((tp) => tp !== catValue)
    : [...prev.type, catValue];
  return {
    ...prev,
    type: nextType,
    landStatus: nextType.includes('land') ? prev.landStatus || [] : [],
  };
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = React.useState(false);
  const [filters, setFilters] = React.useState<FiltersState>(HOME_FILTERS_INITIAL);
  const [filtersHydrated, setFiltersHydrated] = React.useState(false);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [mapProperties, setMapProperties] = React.useState<Property[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [categoryCounts, setCategoryCounts] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState('date_desc');
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(false);
  const [selectedMapPropertyId, setSelectedMapPropertyId] = React.useState<string | null>(null);
  const ITEMS_PER_PAGE = 40;
  /** რუკის მარკერებისთვის — API max limit */
  const MAP_FETCH_LIMIT = 5000;

  const homeMapProps = {
    properties: mapProperties,
    richHoverTooltips: true as const,
    selectedPropertyId: selectedMapPropertyId,
    onPropertyMarkerClick: setSelectedMapPropertyId
  };

  React.useEffect(() => {
    setMounted(true);
    clearHomeFiltersStorage();
    setFiltersHydrated(true);
  }, []);

  const clearAllFilters = React.useCallback(() => {
    clearHomeFiltersStorage();
    setCurrentPage(1);
    setFilters({ ...HOME_FILTERS_INITIAL });
  }, []);

  const handleFiltersChange = React.useCallback((next: FiltersState) => {
    setCurrentPage(1);
    setFilters(next);
  }, []);

  const patchFilters = React.useCallback((updater: (prev: FiltersState) => FiltersState) => {
    setCurrentPage(1);
    setFilters(updater);
  }, []);

  const handleSortChange = React.useCallback((next: string) => {
    setCurrentPage(1);
    setSortBy(next);
  }, []);

  const tr = React.useCallback(
    (key: string, fallback: string) => (mounted ? t(key) : fallback),
    [mounted, t]
  );

  // URL-დან amenities-ის წაკითხვა (property detail გვერდიდან გადამისამართებისას)
  React.useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const amenitiesParam = params.get('amenities');
    if (amenitiesParam) {
      try {
        const amenities = JSON.parse(amenitiesParam);
        if (Array.isArray(amenities) && amenities.length > 0) {
          setFilters((prev) => ({ ...prev, amenities }));
          window.history.replaceState({}, '', '/');
        }
      } catch (e) {}
    }
  }, [filtersHydrated]);

  React.useEffect(() => {
    if (!filtersHydrated) return;

    let alive = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      const baseQuery = filtersToPropertyQuery(filters, sortBy, i18n.language);

      listProperties({
        ...baseQuery,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      })
        .then((listRes) => {
          if (!alive) return;
          setProperties(listRes.properties);
          setTotalCount(listRes.total ?? listRes.properties.length);
          setTotalPages(listRes.totalPages ?? 1);
          trackSearchFilters('home', filters, {
            sort: sortBy,
            resultCount: listRes.total ?? listRes.properties.length,
          });
        })
        .catch((e) => {
          if (!alive) return;
          setError(e.message || 'Failed');
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
          setHasLoadedOnce(true);
        });
    }, 400);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [filters, sortBy, i18n.language, filtersHydrated, currentPage]);

  // რუკის მარკერები — იგივე ფილტრებით, გვერდისგან დამოუკიდებლად
  React.useEffect(() => {
    if (!filtersHydrated) return;

    let alive = true;
    const timer = window.setTimeout(() => {
      listProperties({
        ...filtersToPropertyQuery(filters, sortBy, i18n.language),
        page: 1,
        limit: MAP_FETCH_LIMIT,
      })
        .then((mapRes) => {
          if (!alive) return;
          setMapProperties(mapRes.properties);
          setSelectedMapPropertyId(null);
        })
        .catch(() => {
          if (!alive) return;
          setMapProperties([]);
        });
    }, 400);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [filters, sortBy, i18n.language, filtersHydrated]);

  // კატეგორიების რაოდენობა — მსუბუქი count, არა სრული სია
  React.useEffect(() => {
    listProperties({
      lang: apiLang(i18n.language),
      page: 1,
      limit: 1,
      includeTypeCounts: true,
    })
      .then((r) => setCategoryCounts(r.typeCounts || {}))
      .catch(() => {});
  }, [i18n.language]);

  // გვერდის ცვლილებისას ზემოთ სქროლი
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchQuery = filters.q.trim();
  const showSkeleton = loading || !filtersHydrated;
  const showEmptyResults = filtersHydrated && hasLoadedOnce && !loading && !error && totalCount === 0;

  return (
    <div className="grid gap-4 text-slate-900">
      {/* ფილტრები ჰორიზონტალურად */}
      <Filters value={filters} onChange={handleFiltersChange} onClearAll={clearAllFilters} />

      {/* კატეგორიები - მობაილზე ჩამოსაშლელი, დესკტოპზე ყოველთვის ჩანს */}
      <div className="md:hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setCategoriesOpen(!categoriesOpen)}
          className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <span>🏠</span>
            <span>{tr('categories', 'კატეგორიები')}</span>
            {filters.type.length > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center dark:bg-amber-500 dark:text-black">
                {filters.type.length}
              </span>
            )}
          </div>
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {categoriesOpen && (
          <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-700">
            {PROPERTY_CATEGORIES.map((cat) => {
              const isSelected = filters.type.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => patchFilters((prev) => togglePropertyType(prev, cat.value, isSelected))}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:border-amber-500 dark:bg-amber-950/40' 
                      : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                >
                  <span className="text-xl mb-0.5">{cat.icon}</span>
                  <span className={`text-[10px] font-medium text-center leading-tight ${
                    isSelected ? 'text-blue-700 dark:text-amber-400' : 'text-slate-700 dark:text-zinc-300'
                  }`}>
                    {tr(cat.key, cat.value)}
                  </span>
                  <span className={`text-[10px] ${
                    isSelected ? 'text-blue-600 dark:text-amber-500/90' : 'text-slate-400 dark:text-zinc-500'
                  }`}>
                    {categoryCounts[cat.value] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* კატეგორიები - დესკტოპზე ყოველთვის ჩანს */}
      <div className="hidden md:grid grid-cols-5 lg:grid-cols-10 gap-3">
        {PROPERTY_CATEGORIES.map((cat) => {
          const isSelected = filters.type.includes(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => patchFilters((prev) => togglePropertyType(prev, cat.value, isSelected))}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all hover:shadow-md hover:scale-105 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md dark:border-amber-500 dark:bg-amber-950/40 dark:shadow-amber-900/20' 
                  : 'border-slate-200 bg-white hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-600/50'
              }`}
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className={`text-xs font-medium text-center ${
                isSelected ? 'text-blue-700 dark:text-amber-400' : 'text-slate-700 dark:text-zinc-300'
              }`}>
                {tr(cat.key, cat.value)}
              </span>
              <span className={`text-xs mt-0.5 ${
                isSelected ? 'text-blue-600 dark:text-amber-500/90' : 'text-slate-400 dark:text-zinc-500'
              }`}>
                {categoryCounts[cat.value] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {filters.type.includes('land') && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
            {tr('filter_land_status', 'მიწის სტატუსი')}
          </div>
          <div className="flex flex-wrap gap-2">
            {LAND_STATUS_OPTIONS.map((item) => {
              const selected = (filters.landStatus || []).includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    patchFilters((prev) => ({
                      ...prev,
                      landStatus: selected
                        ? (prev.landStatus || []).filter((s) => s !== item.value)
                        : [...(prev.landStatus || []), item.value],
                    }))
                  }
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  {tr(item.labelKey, item.value)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* რუკა - მობაილზე ჩამოსაშლელი */}
      <div className="md:hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
          >
            <div className="flex items-center gap-2">
              <span>🗺️</span>
              <span>{tr('map', 'რუკა')}</span>
            </div>
            <svg className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${mapOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Link
            href={buildMapHref(filters, sortBy)}
            className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
          >
            {tr('map_open_full_view', 'რუკაზე ძებნა')}
          </Link>
        </div>
        {mapOpen && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-zinc-700">
            <MapView {...homeMapProps} />
          </div>
        )}
      </div>

      {/* რუკა - დესკტოპზე ყოველთვის ჩანს */}
      <div className="relative hidden md:block">
        <Link
          href={buildMapHref(filters, sortBy)}
          className="absolute right-3 top-3 z-[400] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-amber-400 dark:ring-zinc-600 dark:hover:bg-zinc-800"
        >
          {tr('map_open_full_view', 'რუკაზე ძებნა')}
        </Link>
        <MapView {...homeMapProps} />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">{error}</div>}

      {showSkeleton && <PropertyCardGridSkeleton count={8} compactPhoto />}

      {showEmptyResults ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl dark:bg-zinc-800">
            🔍
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-100">
            {tr('search_no_results_title', 'ობიექტი ვერ მოიძებნა')}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            {searchQuery
              ? (mounted
                  ? t('search_no_results_query', { query: searchQuery })
                  : `საძიებო სიტყვით «${searchQuery}» შესაბამისი განცხადება ვერ მოიძებნა.`)
              : tr(
                  'search_no_results_filters',
                  'თქვენი არჩეული ფილტრებით განცხადება ვერ მოიძებნა.'
                )}
          </p>
          {searchQuery ? (
            <p className="mt-2 font-medium text-slate-800 dark:text-amber-400/90">
              «{searchQuery}»
            </p>
          ) : null}
          <p className="mx-auto mt-4 max-w-md text-xs text-slate-500 dark:text-zinc-500">
            {tr('search_no_results_hint', 'შეგიძლიათ გაასუფთავოთ ფილტრები და თავიდან სცადოთ.')}
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            ✕ {tr('clear_filters', 'გასუფთავება')}
          </button>
        </div>
      ) : null}

      {/* სორტირება და რაოდენობა */}
      {!showSkeleton && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600 dark:text-zinc-300">
            {tr('found', 'ნაპოვნია')}: <span className="font-semibold text-slate-900 dark:text-amber-400">{totalCount}</span> {tr('objects', 'ობიექტი')}
            {totalPages > 1 && (
              <span className="ml-2">
                ({tr('page_of', 'გვერდი')} {currentPage} / {totalPages})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-zinc-500">{tr('sorting', 'სორტირება')}:</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="date_desc">{tr('sort_date_desc', 'ახალი → ძველი')}</option>
              <option value="date_asc">{tr('sort_date_asc', 'ძველი → ახალი')}</option>
              <option value="price_asc">{tr('sort_price_asc', 'ფასი ↑')}</option>
              <option value="price_desc">{tr('sort_price_desc', 'ფასი ↓')}</option>
              <option value="area_asc">{tr('sort_area_asc', 'ფართობი ↑')}</option>
              <option value="area_desc">{tr('sort_area_desc', 'ფართობი ↓')}</option>
              <option value="views_desc">{tr('sort_views_desc', 'ნახვები ↓')}</option>
              <option value="views_asc">{tr('sort_views_asc', 'ნახვები ↑')}</option>
            </select>
          </div>
        </div>
      )}

      {!showSkeleton && !showEmptyResults && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {properties.map((p) => (
            <PropertyCard key={p._id} p={p} compactPhoto />
          ))}
        </div>
      )}

      {/* პაგინაცია */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {/* წინა გვერდი */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200"
          >
            ←
          </button>

          {/* გვერდების ნომრები */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // ვაჩვენებთ პირველ, ბოლო, და მიმდინარე გვერდის ახლოს მყოფებს
            const showPage = 
              page === 1 || 
              page === totalPages || 
              Math.abs(page - currentPage) <= 2;
            
            const showEllipsis = 
              (page === 2 && currentPage > 4) ||
              (page === totalPages - 1 && currentPage < totalPages - 3);

            if (showEllipsis) {
              return <span key={page} className="px-2 text-slate-400 dark:text-zinc-600">...</span>;
            }

            if (!showPage) return null;

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`min-w-[40px] px-3 py-2 rounded-lg border transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600 dark:bg-amber-500 dark:border-amber-500 dark:text-black'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:text-zinc-200'
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* შემდეგი გვერდი */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
