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
import { HomeHero } from '@/components/HomeHero';
import { HomeQuickRail, HomeServiceRail } from '@/components/HomeBrowseRails';
import { HomeDealBar } from '@/components/HomeDealBar';
import { HomeTypePanel, HomeLandStatusPanel } from '@/components/HomeTypePanel';
import { Designable } from '@/components/home-design/Designable';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { useTheme } from '@/components/ThemeProvider';
import { isRailSectionHiddenForMode } from '@/lib/homeDesignLayout';
import { useIsDesignDesktop } from '@/lib/useIsDesignDesktop';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const homeDesign = useHomeDesignOptional();
  const { activeModeId } = useTheme();
  const designMode = homeDesign?.designMode ?? false;
  const isDesktopLayout = useIsDesignDesktop();
  const modeId = activeModeId || 'day';
  const serviceItemW = homeDesign?.layout.serviceRail.itemW ?? 200;
  const mapW = homeDesign?.layout.map.w ?? 1280;
  const mapH = homeDesign?.layout.map.h ?? 360;
  const listingsW = homeDesign?.layout.listings?.w ?? 1280;
  const listingsMinH = homeDesign?.layout.listings?.h ?? 480;
  const typePanelW = homeDesign?.layout.typePanel.w ?? 1280;
  const typePanelH = homeDesign?.layout.typePanel.h ?? 164;
  const typePanelPad = homeDesign?.layout.typePanel.pad ?? 10;
  const typePanelGap = homeDesign?.layout.typePanel.gap ?? 12;
  const quickW = homeDesign?.layout.quickRail.w ?? 200;
  const centerW = Math.max(mapW, typePanelW, listingsW);
  const serviceSectionHidden = isRailSectionHiddenForMode(
    homeDesign?.layout.serviceRail,
    modeId
  );
  const quickSectionHidden = isRailSectionHiddenForMode(
    homeDesign?.layout.quickRail,
    modeId
  );
  const showServiceCol = designMode || !serviceSectionHidden;
  const showQuickCol = designMode || !quickSectionHidden;
  const sideCol = Math.max(
    showServiceCol ? serviceItemW : 0,
    showQuickCol ? quickW : 0
  );
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
  const [mapOpen, setMapOpen] = React.useState(false);
  const [selectedMapPropertyId, setSelectedMapPropertyId] = React.useState<string | null>(null);
  const ITEMS_PER_PAGE = 40;
  const MAP_FETCH_LIMIT = 5000;

  const homeMapProps = {
    properties: mapProperties,
    richHoverTooltips: true as const,
    selectedPropertyId: selectedMapPropertyId,
    onPropertyMarkerClick: setSelectedMapPropertyId,
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
    (key: string, fallback: string) => {
      if (!mounted) return fallback;
      const value = t(key);
      return !value || value === key ? fallback : value;
    },
    [mounted, t]
  );

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
      } catch {
        /* ignore */
      }
    }
  }, [filtersHydrated]);

  React.useEffect(() => {
    if (!filtersHydrated) return;
    listProperties({
      lang: apiLang(i18n.language),
      page: 1,
      limit: 1,
      includeTypeCounts: true,
    })
      .then((r) => setCategoryCounts(r.typeCounts || {}))
      .catch(() => {});
  }, [filtersHydrated, i18n.language]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchQuery = filters.q.trim();
  const showSkeleton = loading || !filtersHydrated;
  const showEmptyResults = filtersHydrated && hasLoadedOnce && !loading && !error && totalCount === 0;
  const mapHref = buildMapHref(filters, sortBy);

  return (
    <div className="text-slate-900">
      <HomeHero
        title={tr('home_hero_title', 'შენი სახლი საქართველოში')}
        subtitle={tr(
          'home_hero_subtitle',
          'იპოვე ბინა, სახლი ან კომერციული ფართი — მარტივი ძიებით და რუკით.'
        )}
        dealBar={
          <HomeDealBar
            filters={filters}
            onChange={handleFiltersChange}
            designMode={designMode}
          />
        }
      >
        <Filters
          value={filters}
          onChange={handleFiltersChange}
          variant="heroCompact"
        />
      </HomeHero>

      {/* ქვედა ბლოკი — მობილური fluid; desktop-ზე Design Mode სიგანე */}
      <div
        className="mx-auto w-full max-w-full px-3 py-4 sm:px-4 xl:px-0"
        style={
          isDesktopLayout
            ? { maxWidth: `calc(${centerW}px + ${sideCol * 2}px + 2.5rem)` }
            : undefined
        }
      >
        <div className="flex items-start justify-center gap-5">
          <aside
            className={`sticky top-28 hidden shrink-0 justify-end xl:flex ${
              showServiceCol ? '' : '!hidden'
            }`}
            style={{ width: showServiceCol ? sideCol || serviceItemW : 0 }}
          >
            {showServiceCol ? (
              <Designable id="serviceRail">
                <HomeServiceRail />
              </Designable>
            ) : null}
          </aside>

          <div
            className="min-w-0 w-full shrink"
            style={
              isDesktopLayout
                ? { maxWidth: centerW, width: centerW }
                : { maxWidth: '100%', width: '100%' }
            }
          >
            <div className="w-full space-y-4">
              <Designable id="typePanel">
                <div
                  className="mx-auto w-full"
                  style={
                    isDesktopLayout
                      ? { maxWidth: typePanelW, width: '100%', height: typePanelH }
                      : { maxWidth: '100%', width: '100%', height: 'auto' }
                  }
                >
                  <HomeTypePanel
                    filters={filters}
                    onPatch={patchFilters}
                    categoryCounts={categoryCounts}
                    tr={tr}
                    designMode={designMode}
                    pad={typePanelPad}
                    gap={typePanelGap}
                  />
                </div>
              </Designable>

              <HomeLandStatusPanel
                filters={filters}
                onPatch={patchFilters}
                tr={tr}
              />

              <div className="md:hidden rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMapOpen(!mapOpen)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
                  >
                    <span>{tr('map', 'რუკა')}</span>
                    <svg
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${mapOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Link
                    href={mapHref}
                    className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"
                  >
                    {tr('map_open_full_view', 'რუკაზე ძებნა')}
                  </Link>
                </div>
                {mapOpen && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-zinc-700">
                    <MapView {...homeMapProps} heightClassName="h-[360px]" />
                  </div>
                )}
              </div>

              <Designable id="map" className="hidden md:block">
                <div
                  className="relative mx-auto w-full overflow-hidden rounded-lg"
                  style={{
                    maxWidth: isDesktopLayout ? mapW : '100%',
                    width: '100%',
                    height: Math.max(160, isDesktopLayout ? mapH : 280),
                  }}
                >
                  <Link
                    href={mapHref}
                    className="absolute right-3 top-3 z-[400] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:text-amber-400 dark:ring-zinc-600 dark:hover:bg-zinc-800"
                  >
                    {tr('map_open_full_view', 'რუკაზე ძებნა')}
                  </Link>
                  <MapView
                    key={`home-map-${mapW}x${Math.max(160, mapH)}`}
                    {...homeMapProps}
                    heightClassName="h-full"
                    className="h-full w-full"
                  />
                </div>
              </Designable>

              <div className="mt-4 space-y-4 xl:hidden">
                {!serviceSectionHidden || designMode ? (
                  <div className="flex justify-center overflow-x-auto pb-1">
                    <HomeServiceRail />
                  </div>
                ) : null}
                {!quickSectionHidden || designMode ? (
                  <div className="overflow-x-auto pb-1">
                    <HomeQuickRail />
                  </div>
                ) : null}
              </div>

              <Designable id="listings" className="mt-6">
                <div
                  className="grid w-full gap-4"
                  style={{
                    maxWidth: isDesktopLayout ? listingsW : '100%',
                    width: '100%',
                    minHeight: isDesktopLayout ? listingsMinH : undefined,
                  }}
                >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          )}

          {showSkeleton && <PropertyCardGridSkeleton count={8} compactPhoto />}

          {showEmptyResults ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-100">
                {tr('search_no_results_title', 'ობიექტი ვერ მოიძებნა')}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                {searchQuery
                  ? mounted
                    ? t('search_no_results_query', { query: searchQuery })
                    : `საძიებო სიტყვით «${searchQuery}» შესაბამისი განცხადება ვერ მოიძებნა.`
                  : tr('search_no_results_filters', 'თქვენი არჩეული ფილტრებით განცხადება ვერ მოიძებნა.')}
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {tr('clear_filters', 'გასუფთავება')}
              </button>
            </div>
          ) : null}

          {!showSkeleton && totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600 dark:text-zinc-300">
                {tr('found', 'ნაპოვნია')}:{' '}
                <span className="font-semibold text-slate-900 dark:text-amber-400">{totalCount}</span>{' '}
                {tr('objects', 'ობიექტი')}
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

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200"
              >
                ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                const showEllipsis =
                  (page === 2 && currentPage > 4) ||
                  (page === totalPages - 1 && currentPage < totalPages - 3);

                if (showEllipsis) {
                  return (
                    <span key={page} className="px-2 text-slate-400 dark:text-zinc-600">
                      ...
                    </span>
                  );
                }

                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[40px] rounded-lg border px-3 py-2 transition-colors ${
                      page === currentPage
                        ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
                        : 'border-slate-300 hover:bg-slate-100 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200"
              >
                →
              </button>
            </div>
          )}
                </div>
              </Designable>
            </div>
          </div>

          <aside
            className={`sticky top-28 hidden shrink-0 xl:block ${
              showQuickCol ? '' : '!hidden'
            }`}
            style={{ width: showQuickCol ? sideCol || quickW : 0 }}
          >
            {showQuickCol ? (
              <Designable id="quickRail">
                <HomeQuickRail />
              </Designable>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
