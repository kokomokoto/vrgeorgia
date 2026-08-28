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
  consumeHomeSearchOnMount,
  markHomeFiltersDocumentUnloading,
  markHomeFiltersForRestore,
  saveHomeSearchSnapshot,
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
import {
  DEFAULT_TYPE_PANEL_ITEMS,
  isRailSectionHiddenForMode,
  resolveTypePanelItemsForMode,
  typePanelNeedsCountQuery,
} from '@/lib/homeDesignLayout';
import {
  scaleDesignPx,
  useHomeDesignScale,
} from '@/lib/useIsDesignDesktop';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const homeDesign = useHomeDesignOptional();
  const { activeModeId } = useTheme();
  const designMode = homeDesign?.designMode ?? false;
  const modeId = activeModeId || 'day';
  const serviceItemW = homeDesign?.layout.serviceRail.itemW ?? 200;
  const mapW = homeDesign?.layout.map.w ?? 1280;
  const mapH = homeDesign?.layout.map.h ?? 360;
  const listingsW = homeDesign?.layout.listings?.w ?? 1280;
  const listingsMinH = homeDesign?.layout.listings?.h ?? 480;
  const typePanelW = homeDesign?.layout.typePanel.w ?? 1280;
  const typePanelPad = homeDesign?.layout.typePanel.pad ?? 10;
  const typePanelGap = homeDesign?.layout.typePanel.gap ?? 12;
  const quickW = homeDesign?.layout.quickRail.w ?? 200;
  const centerW = Math.max(mapW, typePanelW, listingsW);
  const designScale = useHomeDesignScale(centerW);
  const mapHScaled = scaleDesignPx(mapH, designScale, 180);
  const serviceSectionHidden = isRailSectionHiddenForMode(
    homeDesign?.layout.serviceRail,
    modeId
  );
  const quickSectionHidden = isRailSectionHiddenForMode(
    homeDesign?.layout.quickRail,
    modeId
  );
  // WYSIWYG: Design Mode must use the same visibility as the public page for the active mode
  const showServiceCol = !serviceSectionHidden;
  const showQuickCol = !quickSectionHidden;
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
  const loadedMapQueryRef = React.useRef<string | null>(null);
  const prevMapOpenRef = React.useRef(false);

  const homeMapProps = {
    properties: mapProperties,
    richHoverTooltips: true as const,
    selectedPropertyId: selectedMapPropertyId,
    onPropertyMarkerClick: setSelectedMapPropertyId,
  };

  React.useEffect(() => {
    setMounted(true);
    const saved = consumeHomeSearchOnMount();
    if (saved) {
      setFilters(saved.filters);
      setSortBy(saved.sort);
      setCurrentPage(saved.page);
    } else {
      setFilters({ ...HOME_FILTERS_INITIAL });
      setSortBy('date_desc');
      setCurrentPage(1);
    }
    setFiltersHydrated(true);
  }, []);

  // SPA-ით გასვლა (ობიექტი და სხვა) → უკან დაბრუნებისას აღდგეს;
  // რეფრეშზე beforeunload მონიშნავს unloading-ს და restore არ დაისმება.
  React.useEffect(() => {
    const onBeforeUnload = () => {
      markHomeFiltersDocumentUnloading();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      markHomeFiltersForRestore();
    };
  }, []);

  React.useEffect(() => {
    if (!filtersHydrated) return;
    saveHomeSearchSnapshot({ filters, sort: sortBy, page: currentPage });
  }, [filters, sortBy, currentPage, filtersHydrated]);

  const clearAllFilters = React.useCallback(() => {
    clearHomeFiltersStorage();
    setCurrentPage(1);
    setSortBy('date_desc');
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

  const needTypeCounts = React.useMemo(() => {
    const fromLayout = homeDesign?.layout.typePanel.items;
    const base = fromLayout?.length ? fromLayout : DEFAULT_TYPE_PANEL_ITEMS;
    return typePanelNeedsCountQuery(
      resolveTypePanelItemsForMode(base, activeModeId || 'day')
    );
  }, [homeDesign?.layout.typePanel.items, activeModeId]);

  React.useEffect(() => {
    if (!filtersHydrated) return;
    if (!needTypeCounts) {
      setCategoryCounts({});
      return;
    }
    listProperties({
      lang: apiLang(i18n.language),
      page: 1,
      limit: 1,
      includeTypeCounts: true,
    })
      .then((r) => setCategoryCounts(r.typeCounts || {}))
      .catch(() => {});
  }, [filtersHydrated, i18n.language, needTypeCounts]);

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
    if (designMode) setMapOpen(true);
  }, [designMode]);

  const mapQueryKey = `${sortBy}|${i18n.language}|${JSON.stringify(filters)}`;

  React.useEffect(() => {
    if (!filtersHydrated || !mapOpen) {
      prevMapOpenRef.current = mapOpen;
      return;
    }
    if (loadedMapQueryRef.current === mapQueryKey) {
      prevMapOpenRef.current = true;
      return;
    }

    const justOpened = !prevMapOpenRef.current;
    prevMapOpenRef.current = true;

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
          loadedMapQueryRef.current = mapQueryKey;
        })
        .catch(() => {
          if (!alive) return;
          setMapProperties([]);
        });
    }, justOpened ? 0 : 400);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [filters, sortBy, i18n.language, filtersHydrated, mapOpen, mapQueryKey]);

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

      {/* ქვედა ბლოკი — იგივე ცენტრის სიგანე რაც ჰეროს სერჩს; rail-ები გვერდით, ცენტრს არ ავიწროებენ */}
      <div
        className="relative mx-auto w-full max-w-full px-3 pb-3 sm:px-0 sm:py-4 max-md:pt-[var(--mobile-stack)] md:max-w-[var(--home-max)]"
        style={
          {
            '--mobile-stack': `${homeDesign?.layout.hero.mobileStackGap ?? 4}px`,
            '--home-max':
              sideCol > 0
                ? `calc(${centerW}px + ${sideCol * 2}px + 2.5rem)`
                : `${centerW}px`,
          } as React.CSSProperties
        }
      >
        {showServiceCol ? (
          <aside
            className="absolute left-0 top-0 z-[1] hidden w-[var(--home-side-col)] justify-end xl:flex"
            style={
              {
                '--home-side-col': `${sideCol || serviceItemW}px`,
                width: sideCol || serviceItemW,
              } as React.CSSProperties
            }
          >
            <div className="sticky top-28">
              <Designable id="serviceRail">
                <HomeServiceRail />
              </Designable>
            </div>
          </aside>
        ) : null}

        <div
          data-design-center
          className="relative z-0 mx-auto min-w-0 w-full max-w-full md:max-w-[var(--center-w)]"
          style={{ '--center-w': `${centerW}px` } as React.CSSProperties}
        >
            <div className="flex w-full flex-col max-md:[gap:var(--mobile-stack)] sm:space-y-4 md:block">
              <Designable id="typePanel">
                <div
                  className="mx-auto h-auto w-full max-w-full md:h-full md:max-w-[var(--type-w)]"
                  style={
                    {
                      width: '100%',
                      '--type-w': `${typePanelW}px`,
                    } as React.CSSProperties
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
                    designScale={1}
                  />
                </div>
              </Designable>

              <HomeLandStatusPanel
                filters={filters}
                onPatch={patchFilters}
                tr={tr}
              />

              <Designable id="map">
                <div
                  className="mx-auto w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 md:max-w-[var(--map-w)]"
                  style={
                    {
                      width: '100%',
                      '--map-w': `${mapW}px`,
                    } as React.CSSProperties
                  }
                >
                  <div className="flex min-h-11 items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setMapOpen((open) => !open)}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left text-slate-700 dark:text-zinc-200"
                      aria-expanded={mapOpen}
                      aria-label={
                        mapOpen
                          ? tr('map_collapse', 'რუკის ჩაკეცვა')
                          : tr('map_expand', 'რუკის ჩამოშლა')
                      }
                    >
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        {tr('map', 'რუკა')}
                      </span>
                      <svg
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${mapOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <Link
                      href={mapHref}
                      className="pointer-events-auto shrink-0 whitespace-nowrap rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400 md:px-3 md:py-2 md:text-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {tr('map_open_full_view', 'რუკაზე ძებნა')}
                    </Link>
                  </div>
                  <div
                    className={`overflow-hidden transition-[height] duration-300 ease-out ${
                      mapOpen
                        ? 'h-[360px] border-t border-slate-100 dark:border-zinc-700 md:h-[var(--map-h)]'
                        : 'h-0'
                    }`}
                    style={
                      {
                        '--map-h': `${Math.max(160, mapHScaled)}px`,
                      } as React.CSSProperties
                    }
                  >
                    {mapOpen ? (
                      <div
                        className="pointer-events-auto relative h-full"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={mapHref}
                          aria-label={tr('map_open_full_view', 'რუკაზე ძებნა')}
                          title={tr('map_open_full_view', 'რუკაზე ძებნა')}
                          className="absolute bottom-3 right-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-lg bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                          </svg>
                        </Link>
                        <MapView
                          key={`home-map-${mapW}x${Math.max(160, mapH)}`}
                          {...homeMapProps}
                          heightClassName="h-full"
                          className="h-full w-full"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </Designable>

              <div className="space-y-3 xl:hidden sm:mt-4">
                {!serviceSectionHidden ? (
                  <div className="flex justify-center overflow-x-auto pb-1">
                    <HomeServiceRail />
                  </div>
                ) : null}
                {!quickSectionHidden ? (
                  <div className="overflow-x-auto pb-1">
                    <HomeQuickRail />
                  </div>
                ) : null}
              </div>

              <Designable id="listings" className="sm:mt-6">
                <div
                  className="grid w-full gap-4 max-w-full md:max-w-[var(--listings-w)] md:min-h-[var(--listings-min-h)]"
                  style={
                    {
                      width: '100%',
                      '--listings-w': `${listingsW}px`,
                      '--listings-min-h': `${scaleDesignPx(listingsMinH, designScale, 240)}px`,
                    } as React.CSSProperties
                  }
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
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
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
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs text-slate-500 dark:text-zinc-500">{tr('sorting', 'სორტირება')}:</span>
                <select
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm sm:flex-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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

        {showQuickCol ? (
          <aside
            className="absolute right-0 top-0 z-[1] hidden xl:block"
            style={{ width: sideCol || quickW }}
          >
            <div className="sticky top-28">
              <Designable id="quickRail">
                <HomeQuickRail />
              </Designable>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
