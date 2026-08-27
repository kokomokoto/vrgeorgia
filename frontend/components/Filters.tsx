'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CityCombobox } from './CityCombobox';
import TbilisiDistrictSelector, { CITIES_WITH_DISTRICTS } from './TbilisiDistrictSelector';
import { ExtendedSearchModal } from './ExtendedSearchModal';
import { LocationPickerModal } from './LocationPickerModal';
import { CITY_REGION_MAP, GEORGIAN_REGIONS, TBILISI_SURROUNDINGS_LABEL } from '@/lib/georgiaLocations';
import { HistogramRangeSlider } from './HistogramRangeSlider';
import { useCurrencyRate } from '@/lib/currency';
import {
  clampToStep,
  collectPropertyAreas,
  collectPropertyPrices,
  computeHistogramBuckets,
  computePropertyFilterRanges,
  rangeStep,
  resolvePriceFilterType,
  snapRangeBounds,
} from '@/lib/propertyFilterRanges';
import type { Property } from '@/lib/types';
import { parseSearchInputValue } from '@/lib/searchInput';
import { LAND_STATUS_OPTIONS } from '@/lib/propertyTypeUi';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { SearchControlShell } from '@/components/home-design/SearchControlShell';
import {
  DEFAULT_SEARCH,
  SEARCH_CONTROL_IDS,
  resolveSearchControl,
  type SearchLayout,
} from '@/lib/homeDesignLayout';
import { useHomeDesignScale, scaleDesignPx } from '@/lib/useIsDesignDesktop';

export const DEAL_TYPES = [
  { value: 'sale', key: 'deal_sale', icon: '💰' },
  { value: 'rent', key: 'deal_rent', icon: '🔑' },
  { value: 'mortgage', key: 'deal_mortgage', icon: '🏦' },
];

/** სრული რუკის sidebar — იგივე კატეგორიები, რაც მთავარ გვერდზე */
const PROPERTY_TYPE_CHIPS = [
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

export type FiltersState = {
  q: string;
  minPrice: string;
  maxPrice: string;
  priceCurrency: string;
  priceType: string;
  city: string;
  region: string;
  tbilisiDistrict: string;
  tbilisiSubdistricts: string[];
  type: string[];
  dealType: string[];
  has3d: string;
  hasPhotos: string;
  minSqm: string;
  maxSqm: string;
  minConstructionYear: string;
  maxConstructionYear: string;
  minRenovationYear: string;
  maxRenovationYear: string;
  rooms: string[];
  bedrooms: string[];
  /** აივნების რაოდენობა — backend: balcony $in */
  balconies: string[];
  amenities: string[];
  buildingProject: string[];
  renovationStatus: string[];
  /** ახალაშენებული / მშენებარე / ძველი */
  buildingStatus: string[];
  /** სასოფლო / არასასოფლო — მიწისთვის */
  landStatus: string[];
  propertyId: string;
};

function cloneFiltersState(f: FiltersState): FiltersState {
  return {
    ...f,
    type: [...(f.type || [])],
    dealType: [...(f.dealType || [])],
    tbilisiSubdistricts: [...(f.tbilisiSubdistricts || [])],
    rooms: [...(f.rooms || [])],
    bedrooms: [...(f.bedrooms || [])],
    balconies: [...(f.balconies || [])],
    amenities: [...(f.amenities || [])],
    buildingProject: [...(f.buildingProject || [])],
    renovationStatus: [...(f.renovationStatus || [])],
    buildingStatus: [...(f.buildingStatus || [])],
    landStatus: [...(f.landStatus || [])],
  };
}

function sameFilterField(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

/** mapSidebar: ჩამოსაშლელები document flow-ში — არ იჭრება overflow-y aside-ში */
const FilterDropdownLayoutContext = React.createContext<{ inline: boolean; spacious?: boolean }>({
  inline: false,
  spacious: false,
});

/** Hero search bar visual styles from Design Mode */
const HeroSearchStyleContext = React.createContext<SearchLayout | null>(null);

/** Per-control height override (from SearchControlShell / design layout) */
const SearchControlMetricsContext = React.createContext<{ h?: number }>({});

function useHeroSearchStyle(): SearchLayout | null {
  return React.useContext(HeroSearchStyleContext);
}

function useSearchControlMetrics(): { h?: number } {
  return React.useContext(SearchControlMetricsContext);
}

function HeroSearchField({
  wrapperClassName,
  heroCompact,
  heroSearchStyle,
  placeholder,
  value,
  onChange,
  onSearch,
}: {
  wrapperClassName: string;
  heroCompact: boolean;
  heroSearchStyle: SearchLayout | null;
  placeholder: string;
  value: string;
  onChange: (patch: Partial<FiltersState>) => void;
  onSearch?: () => void;
}) {
  const metrics = useSearchControlMetrics();
  const inputH =
    metrics.h ?? heroSearchStyle?.inputHeight ?? (heroCompact ? 48 : undefined);
  return (
    <div className={wrapperClassName}>
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        className={`w-full min-w-0 border border-slate-200 bg-white pl-10 pr-3 leading-none text-slate-900 placeholder:text-slate-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
          heroCompact || heroSearchStyle ? 'py-0' : 'rounded-lg py-2.5 text-sm'
        } ${heroSearchStyle ? '' : heroCompact ? 'h-12 rounded-lg text-sm' : ''}`}
        style={
          heroSearchStyle || metrics.h
            ? {
                height: inputH,
                borderRadius: heroSearchStyle?.inputBorderRadius,
                borderColor: heroSearchStyle?.inputBorderColor,
                backgroundColor: heroSearchStyle?.inputBackground,
                fontSize: heroSearchStyle?.inputFontSize,
              }
            : undefined
        }
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(parseSearchInputValue(e.target.value))}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !onSearch) return;
          e.preventDefault();
          onSearch();
        }}
      />
    </div>
  );
}

// Dropdown wrapper component
function FilterDropdown({
  label,
  summary,
  children,
  isActive,
  onClear,
  defaultOpen = false,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
  isActive: boolean;
  onClear?: () => void;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const { inline, spacious } = React.useContext(FilterDropdownLayoutContext);
  const heroStyle = useHeroSearchStyle();
  const metrics = useSearchControlMetrics();
  const [open, setOpen] = React.useState(defaultOpen);
  const ref = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number; minWidth: number }>({
    top: 0,
    left: 0,
    minWidth: 280,
  });
  const usePortal = !inline;

  const updatePanelPos = React.useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const minWidth = Math.max(280, Math.round(r.width));
    const left = Math.min(
      Math.max(8, r.left),
      Math.max(8, window.innerWidth - minWidth - 8)
    );
    setPanelPos({
      top: Math.round(r.bottom + 4),
      left: Math.round(left),
      minWidth,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open || !usePortal) return;
    updatePanelPos();
    window.addEventListener('resize', updatePanelPos);
    // capture scroll from any ancestor (hero, page, etc.)
    window.addEventListener('scroll', updatePanelPos, true);
    return () => {
      window.removeEventListener('resize', updatePanelPos);
      window.removeEventListener('scroll', updatePanelPos, true);
    };
  }, [open, usePortal, updatePanelPos]);

  React.useEffect(() => {
    if (inline && spacious) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [inline, spacious]);

  const triggerPad = spacious ? 'px-4 py-3.5 sm:px-5' : 'px-3.5 py-3';
  const minH = metrics.h ?? heroStyle?.triggerMinHeight ?? 48;
  const triggerStyle: React.CSSProperties | undefined = heroStyle
    ? {
        minHeight: minH,
        height: metrics.h ? minH : undefined,
        borderRadius: heroStyle.triggerBorderRadius,
        borderColor: isActive ? undefined : heroStyle.triggerBorderColor,
        backgroundColor: isActive ? undefined : heroStyle.triggerBackground,
      }
    : metrics.h
      ? { minHeight: metrics.h, height: metrics.h }
      : undefined;
  const triggerBtnStyle: React.CSSProperties | undefined = heroStyle
    ? {
        minHeight: minH,
        height: metrics.h ? '100%' : undefined,
        paddingLeft: heroStyle.triggerPadX,
        paddingRight: heroStyle.triggerPadX,
        paddingTop: heroStyle.triggerPadY,
        paddingBottom: heroStyle.triggerPadY,
      }
    : undefined;
  const labelStyle: React.CSSProperties | undefined = heroStyle
    ? {
        fontSize: heroStyle.labelFontSize,
        fontWeight: heroStyle.labelFontWeight,
        color: isActive ? undefined : heroStyle.labelColor,
      }
    : undefined;
  const summaryStyle: React.CSSProperties | undefined = heroStyle
    ? {
        fontSize: heroStyle.summaryFontSize,
        color: heroStyle.summaryColor,
      }
    : undefined;

  if (inline && spacious) {
    return (
      <div
        ref={ref}
        className={`overflow-hidden rounded-2xl border transition-colors ${
          isActive
            ? 'border-blue-200 bg-blue-50/50 dark:border-amber-500/40 dark:bg-amber-950/25'
            : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
        }`}
      >
        <div className="flex w-full items-stretch">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`flex min-w-0 flex-1 items-center justify-between gap-3 ${triggerPad} text-left`}
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                {label}
              </div>
              <div
                className={`mt-0.5 truncate text-base font-medium ${
                  isActive ? 'text-blue-700 dark:text-amber-300' : 'text-slate-800 dark:text-zinc-100'
                }`}
              >
                {summary}
              </div>
            </div>
            <svg
              className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isActive && onClear ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="mr-3 flex h-9 w-9 shrink-0 self-center items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label={t('clear_filters')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        {open && (
          <div className="border-t border-slate-200/80 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950/40 sm:px-5 sm:py-5">
            {children}
          </div>
        )}
      </div>
    );
  }

  const panelClass = inline
    ? `relative z-10 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900`
    : 'rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/50';

  const portalPanel =
    open && usePortal && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            className={panelClass}
            style={{
              position: 'fixed',
              top: panelPos.top,
              left: panelPos.left,
              minWidth: panelPos.minWidth,
              zIndex: 5000,
            }}
            data-filter-dropdown-portal
          >
            {children}
          </div>,
          document.body
        )
      : null;

  const triggerClass = `flex w-full items-center gap-1 rounded-xl border transition-all text-sm ${
    heroStyle ? '' : 'min-h-12'
  } ${
    isActive
      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-amber-500/60 dark:bg-amber-950/35 dark:text-amber-300'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
  }`;

  return (
    <div ref={ref} className={`relative ${open && !inline ? 'z-[200]' : ''}`}>
      <div className={triggerClass} style={triggerStyle}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 text-left ${
            heroStyle ? '' : `min-h-12 ${triggerPad}`
          }`}
          style={triggerBtnStyle}
        >
          <div className={heroStyle ? 'overflow-visible' : 'min-w-0'}>
            <div
              className={`leading-tight ${
                heroStyle ? 'whitespace-nowrap overflow-visible pb-[0.12em]' : 'truncate'
              } ${
                heroStyle
                  ? isActive
                    ? 'text-blue-700 dark:text-amber-300'
                    : heroStyle.labelColor
                      ? ''
                      : 'text-slate-800 dark:text-zinc-100'
                  : `text-sm font-bold ${
                      isActive ? 'text-blue-700 dark:text-amber-300' : 'text-slate-800 dark:text-zinc-100'
                    }`
              }`}
              style={heroStyle ? labelStyle : undefined}
            >
              {label}
            </div>
            {isActive ? (
              <div
                className={`mt-0.5 font-medium text-blue-700 dark:text-amber-300 ${
                  heroStyle ? 'whitespace-nowrap' : 'truncate text-xs'
                }`}
                style={summaryStyle}
              >
                {summary}
              </div>
            ) : null}
          </div>
          <svg
            className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isActive && onClear ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/90 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            aria-label={t('clear_filters')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
      {open && inline ? <div className={panelClass}>{children}</div> : null}
      {portalPanel}
    </div>
  );
}

function LocationFilterTrigger({
  label,
  summary,
  isActive,
  onClear,
  onOpen,
}: {
  label: string;
  summary: string;
  isActive: boolean;
  onClear?: () => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const heroStyle = useHeroSearchStyle();
  const metrics = useSearchControlMetrics();
  const minH = metrics.h ?? heroStyle?.triggerMinHeight ?? 48;
  const boxStyle: React.CSSProperties | undefined = heroStyle
    ? {
        minHeight: minH,
        height: metrics.h ? minH : undefined,
        borderRadius: heroStyle.triggerBorderRadius,
        borderColor: isActive ? undefined : heroStyle.triggerBorderColor,
        backgroundColor: isActive ? undefined : heroStyle.triggerBackground,
      }
    : metrics.h
      ? { minHeight: metrics.h, height: metrics.h }
      : undefined;
  const btnStyle: React.CSSProperties | undefined = heroStyle
    ? {
        minHeight: minH,
        height: metrics.h ? '100%' : undefined,
        paddingLeft: heroStyle.triggerPadX,
        paddingRight: heroStyle.triggerPadX,
        paddingTop: heroStyle.triggerPadY,
        paddingBottom: heroStyle.triggerPadY,
      }
    : undefined;
  const labelStyle: React.CSSProperties | undefined = heroStyle
    ? {
        fontSize: heroStyle.labelFontSize,
        fontWeight: heroStyle.labelFontWeight,
        color: isActive ? undefined : heroStyle.labelColor,
      }
    : undefined;
  const summaryStyle: React.CSSProperties | undefined = heroStyle
    ? {
        fontSize: heroStyle.summaryFontSize,
        color: heroStyle.summaryColor,
      }
    : undefined;

  return (
    <div
      className={`flex w-full items-center gap-1 rounded-xl border text-sm transition-all ${
        heroStyle ? '' : 'min-h-12'
      } ${
        isActive
          ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-amber-500/60 dark:bg-amber-950/35 dark:text-amber-300'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
      }`}
      style={boxStyle}
    >
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-w-0 flex-1 items-center justify-between gap-2 text-left ${
          heroStyle ? '' : 'min-h-12 px-3.5 py-3'
        }`}
        style={btnStyle}
      >
        <div className={heroStyle ? 'overflow-visible' : 'min-w-0'}>
          <div
            className={`leading-tight ${
              heroStyle ? 'whitespace-nowrap overflow-visible pb-[0.12em]' : 'truncate'
            } ${
              heroStyle
                ? isActive
                  ? 'text-blue-700 dark:text-amber-300'
                  : heroStyle.labelColor
                    ? ''
                    : 'text-slate-800 dark:text-zinc-100'
                : `text-sm font-bold ${
                    isActive ? 'text-blue-700 dark:text-amber-300' : 'text-slate-800 dark:text-zinc-100'
                  }`
            }`}
            style={labelStyle}
          >
            {label}
          </div>
          {isActive ? (
            <div
              className={`mt-0.5 font-medium text-blue-700 dark:text-amber-300 ${
                heroStyle ? 'whitespace-nowrap' : 'truncate text-xs'
              }`}
              style={summaryStyle}
            >
              {summary}
            </div>
          ) : null}
        </div>
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isActive && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/90 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
          aria-label={t('clear_filters')}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function Filters({
  value: committed,
  onChange: publish,
  variant = 'default',
  onClearAll,
  rangeProperties,
  showCategories = false,
  hideDealAndSearch = false,
  forceExpanded = false,
}: {
  value: FiltersState;
  onChange: (v: FiltersState) => void;
  /** mapSidebar: სრული რუკის მარცხენა სვეტი — ფილტრები ყოველთვის ხილული, ბადე ვიწრო სვეტისთვის, dropdown-ები inline */
  /** heroCompact: ჰეროზე მხოლოდ გარიგება + ძიება + გაფართოებული */
  variant?: 'default' | 'mapSidebar' | 'heroCompact';
  /** მთავარი გვერდი — ყველა ფილტრის გასუფთავება */
  onClearAll?: () => void;
  /** მიმდინარე ძიების შედეგები (ფასი/ფართობის გარეშე) — სლაიდერის min/max და ჰისტოგრამა */
  rangeProperties?: Property[];
  /** კატეგორიის ჩიპები (ბინა, სახლი...) — აგენტის პროფილზე და სხვა */
  showCategories?: boolean;
  /** გარიგება/სერჩის ზოლი დამალული — მოდალში ჩასასმელად */
  hideDealAndSearch?: boolean;
  /** მობაილის აკორდეონის გარეშე ყოველთვის გახსნილი */
  forceExpanded?: boolean;
}) {
  const { t } = useTranslation();
  const { rate: usdToGel } = useCurrencyRate();
  const design = useHomeDesignOptional();
  const heroSearchStyleRaw =
    variant === 'heroCompact'
      ? ({ ...DEFAULT_SEARCH, ...(design?.layout.search || {}) } as SearchLayout)
      : null;
  const searchCanvasW = heroSearchStyleRaw?.w ?? 1280;
  const designScale = useHomeDesignScale(searchCanvasW);
  /** Desktop keeps designed search chrome; mobile stack ignores sizes via CSS `max-md:` */
  const heroSearchStyle = React.useMemo(() => {
    if (!heroSearchStyleRaw) return null;
    if (designScale >= 0.999) return heroSearchStyleRaw;
    const s = designScale;
    const controls = { ...(heroSearchStyleRaw.controls || {}) } as SearchLayout['controls'];
    for (const id of SEARCH_CONTROL_IDS) {
      const c = resolveSearchControl(heroSearchStyleRaw, id);
      controls[id] = {
        w: scaleDesignPx(c.w, s, 56),
        h: scaleDesignPx(c.h, s, 28),
      };
    }
    return {
      ...heroSearchStyleRaw,
      triggerWidth: scaleDesignPx(heroSearchStyleRaw.triggerWidth, s, 72),
      triggerMinHeight: scaleDesignPx(heroSearchStyleRaw.triggerMinHeight, s, 36),
      triggerPadX: scaleDesignPx(heroSearchStyleRaw.triggerPadX, s, 4),
      triggerPadY: scaleDesignPx(heroSearchStyleRaw.triggerPadY, s, 4),
      labelFontSize: scaleDesignPx(heroSearchStyleRaw.labelFontSize, s, 10),
      summaryFontSize: scaleDesignPx(heroSearchStyleRaw.summaryFontSize, s, 9),
      inputHeight: scaleDesignPx(heroSearchStyleRaw.inputHeight, s, 36),
      inputFontSize: scaleDesignPx(heroSearchStyleRaw.inputFontSize, s, 11),
      buttonHeight: scaleDesignPx(heroSearchStyleRaw.buttonHeight, s, 36),
      buttonFontSize: scaleDesignPx(
        heroSearchStyleRaw.buttonFontSize || heroSearchStyleRaw.labelFontSize,
        s,
        10
      ),
      gap: scaleDesignPx(heroSearchStyleRaw.gap, s, 4),
      controls,
    } as SearchLayout;
  }, [heroSearchStyleRaw, designScale]);
  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(forceExpanded);
  const [extendedOpen, setExtendedOpen] = React.useState(false);
  /** გაფართოებული ძიების დრაფტი — API-ზე იგზავნება მხოლოდ გამოყენებისას */
  const [extendedDraft, setExtendedDraft] = React.useState<FiltersState | null>(null);
  const [locationModalOpen, setLocationModalOpen] = React.useState(false);
  const [heroDraft, setHeroDraft] = React.useState<FiltersState>(() => cloneFiltersState(committed));
  const prevCommittedRef = React.useRef(committed);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const prev = prevCommittedRef.current;
    prevCommittedRef.current = committed;
    if (variant !== 'heroCompact') return;
    setHeroDraft((d) => {
      const next = cloneFiltersState(d);
      let changed = false;
      (Object.keys(committed) as (keyof FiltersState)[]).forEach((key) => {
        if (sameFilterField(committed[key], prev[key])) return;
        const val = committed[key];
        (next as Record<string, unknown>)[key] = Array.isArray(val) ? [...val] : val;
        changed = true;
      });
      return changed ? next : d;
    });
  }, [committed, variant]);

  const heroCompact = variant === 'heroCompact';
  const value =
    extendedOpen && extendedDraft
      ? extendedDraft
      : heroCompact
        ? heroDraft
        : committed;
  const onChange = React.useCallback(
    (next: FiltersState) => {
      if (extendedOpen) setExtendedDraft(next);
      else if (variant === 'heroCompact') setHeroDraft(cloneFiltersState(next));
      else publish(next);
    },
    [extendedOpen, publish, variant]
  );

  const publishHeroSearch = React.useCallback(() => {
    const next = extendedOpen && extendedDraft ? extendedDraft : heroDraft;
    publish(cloneFiltersState(next));
    setHeroDraft(cloneFiltersState(next));
    setExtendedDraft(null);
    setExtendedOpen(false);
  }, [extendedDraft, extendedOpen, heroDraft, publish]);

  const openExtendedSearch = React.useCallback(() => {
    const source = variant === 'heroCompact' ? heroDraft : committed;
    setExtendedDraft(cloneFiltersState(source));
    setExtendedOpen(true);
  }, [committed, heroDraft, variant]);

  const applyExtendedSearch = React.useCallback(() => {
    if (extendedDraft) {
      publish(cloneFiltersState(extendedDraft));
      if (variant === 'heroCompact') setHeroDraft(cloneFiltersState(extendedDraft));
    }
    setExtendedDraft(null);
    setExtendedOpen(false);
  }, [extendedDraft, publish, variant]);

  const discardExtendedSearch = React.useCallback(() => {
    setExtendedDraft(null);
    setExtendedOpen(false);
  }, []);

  const mapSidebar = variant === 'mapSidebar';

  const filterRanges = React.useMemo(() => {
    if (!mapSidebar || !rangeProperties?.length) return null;
    return computePropertyFilterRanges(rangeProperties, {
      priceCurrency: committed.priceCurrency || 'USD',
      priceType: resolvePriceFilterType(committed.priceType),
      usdToGel,
    });
  }, [mapSidebar, rangeProperties, committed.priceCurrency, committed.priceType, usdToGel]);

  const priceSliderBounds = React.useMemo(() => {
    if (!filterRanges?.price) return null;
    const step = rangeStep(filterRanges.price.max - filterRanges.price.min, 'price');
    return { ...snapRangeBounds(filterRanges.price.min, filterRanges.price.max, step), step };
  }, [filterRanges?.price]);

  const areaSliderBounds = React.useMemo(() => {
    if (!filterRanges?.area) return null;
    const step = rangeStep(filterRanges.area.max - filterRanges.area.min, 'area');
    return { ...snapRangeBounds(filterRanges.area.min, filterRanges.area.max, step), step };
  }, [filterRanges?.area]);

  const priceSliderValues = React.useMemo(() => {
    if (!priceSliderBounds) return null;
    const { min, max, step } = priceSliderBounds;
    const curMin = value.minPrice ? clampToStep(Number(value.minPrice), min, max, step) : min;
    const curMax = value.maxPrice ? clampToStep(Number(value.maxPrice), min, max, step) : max;
    return {
      min,
      max,
      step,
      curMin: Math.min(curMin, curMax),
      curMax: Math.max(curMin, curMax),
    };
  }, [priceSliderBounds, value.minPrice, value.maxPrice]);

  const areaSliderValues = React.useMemo(() => {
    if (!areaSliderBounds) return null;
    const { min, max, step } = areaSliderBounds;
    const curMin = value.minSqm ? clampToStep(Number(value.minSqm), min, max, step) : min;
    const curMax = value.maxSqm ? clampToStep(Number(value.maxSqm), min, max, step) : max;
    return {
      min,
      max,
      step,
      curMin: Math.min(curMin, curMax),
      curMax: Math.max(curMin, curMax),
    };
  }, [areaSliderBounds, value.minSqm, value.maxSqm]);

  const priceHistogram = React.useMemo(() => {
    if (!priceSliderBounds || !rangeProperties?.length) return null;
    const values = collectPropertyPrices(rangeProperties, {
      priceCurrency: value.priceCurrency || 'USD',
      priceType: value.priceType,
      usdToGel,
    });
    return computeHistogramBuckets(values, priceSliderBounds.min, priceSliderBounds.max, 28);
  }, [priceSliderBounds, rangeProperties, value.priceCurrency, value.priceType, usdToGel]);

  const areaHistogram = React.useMemo(() => {
    if (!areaSliderBounds || !rangeProperties?.length) return null;
    const values = collectPropertyAreas(rangeProperties);
    return computeHistogramBuckets(values, areaSliderBounds.min, areaSliderBounds.max, 28);
  }, [areaSliderBounds, rangeProperties]);

  // ძიების context-ის შეცვლისას — მხოლოდ საზღვრების შეცვლაზე (არა ყოველ keystroke-ზე)
  const areaBoundsKey = areaSliderBounds
    ? `${areaSliderBounds.min}:${areaSliderBounds.max}:${areaSliderBounds.step}`
    : '';

  React.useEffect(() => {
    if (!mapSidebar || !mounted || !areaSliderBounds) return;

    let nextMinSqm = value.minSqm;
    let nextMaxSqm = value.maxSqm;
    let changed = false;
    const { min, max, step } = areaSliderBounds;

    if (nextMinSqm) {
      const n = Number(nextMinSqm);
      if (!Number.isFinite(n) || n < min) {
        nextMinSqm = '';
        changed = true;
      } else {
        const clamped = clampToStep(n, min, max, step);
        const normalized = clamped <= min ? '' : String(clamped);
        if (normalized !== nextMinSqm) {
          nextMinSqm = normalized;
          changed = true;
        }
      }
    }
    if (nextMaxSqm) {
      const n = Number(nextMaxSqm);
      if (!Number.isFinite(n) || n > max) {
        nextMaxSqm = '';
        changed = true;
      } else {
        const clamped = clampToStep(n, min, max, step);
        const normalized = clamped >= max ? '' : String(clamped);
        if (normalized !== nextMaxSqm) {
          nextMaxSqm = normalized;
          changed = true;
        }
      }
    }

    if (!changed) return;
    onChange({ ...value, minSqm: nextMinSqm, maxSqm: nextMaxSqm });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- მხოლოდ საზღვრის შეცვლაზე
  }, [mapSidebar, mounted, areaBoundsKey]);

  // Prevent hydration mismatches from i18n keys during SSR (non-hero shells).
  // Hero search must match the final UI on first paint — skeleton caused a visible flash.
  if (!mounted && !heroCompact) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-3 md:p-4 dark:border-zinc-700 dark:bg-zinc-900"
        suppressHydrationWarning
      >
        <button
          type="button"
          className="md:hidden w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>ფილტრები</span>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="hidden md:block text-sm text-slate-500 dark:text-zinc-400">ფილტრები იტვირთება...</div>
      </div>
    );
  }

  // აქტიური ფილტრების რაოდენობა (badge-სთვის) — default priceType/currency არ ითვლება
  const activeFilterCount = [
    value.q,
    value.propertyId,
    value.minPrice,
    value.maxPrice,
    value.city,
    value.region,
    value.tbilisiDistrict,
    value.has3d === 'true' ? '1' : '',
    value.hasPhotos === 'true' ? '1' : '',
    value.minSqm,
    value.maxSqm,
    value.minConstructionYear,
    value.maxConstructionYear,
    value.minRenovationYear,
    value.maxRenovationYear,
  ].filter(Boolean).length
    + (value.priceCurrency === 'GEL' ? 1 : 0)
    + (resolvePriceFilterType(value.priceType) === 'per_sqm' ? 1 : 0)
    + value.dealType.length
    + value.type.length
    + value.rooms.length
    + value.bedrooms.length
    + (value.tbilisiSubdistricts?.length || 0)
    + (value.amenities?.length || 0)
    + value.renovationStatus.length
    + value.buildingStatus.length
    + (value.landStatus?.length || 0)
    + value.balconies.length;

  const labels = {
    filters: mounted ? t('filters') : 'ფილტრები',
    search: mounted ? t('search') : 'ძიება',
    search_placeholder: mounted
      ? t('search_placeholder')
      : 'სათაური, ID, ტელეფონი, აგენტის სახელი...',
    city: mounted ? t('city') : 'ქალაქი',
    region: mounted ? t('region') : 'რეგიონი',
    any: mounted ? t('any') : 'ყველა',
    extended_search: mounted ? t('extended_search') : 'გაფართოებული ძიება',
    close: mounted ? t('close') : 'დახურვა',
    clear_filters: mounted ? t('clear_filters') : 'ფილტრების გასუფთავება',
  };

  const set = (k: keyof FiltersState, v: string) => onChange({ ...value, [k]: v });

  const roomsSummary = () => {
    const parts: string[] = [];
    if (value.rooms.length) parts.push(`${value.rooms.join(', ')} ${t('filter_room')}`);
    if (value.bedrooms.length) parts.push(`${value.bedrooms.join(', ')} ${t('filter_bedroom_short')}`);
    if (value.balconies.length) parts.push(`${t('balcony')}: ${value.balconies.join(', ')}`);
    return parts.length > 0 ? parts.join(', ') : labels.any;
  };

  const bedroomsSummary = () => {
    if (value.bedrooms.length) {
      return `${value.bedrooms.join(', ')} ${t('filter_bedroom')}`;
    }
    return labels.any;
  };

  const priceSummary = () => {
    const sym = activePriceCurrency === 'GEL' ? '₾' : '$';
    const suffix = activePriceType === 'per_sqm' ? `/${t('filter_per_sqm')}` : '';
    if (value.minPrice && value.maxPrice) {
      return `${sym}${Number(value.minPrice).toLocaleString()} – ${sym}${Number(value.maxPrice).toLocaleString()}${suffix}`;
    }
    if (value.minPrice) return `${sym}${Number(value.minPrice).toLocaleString()}+${suffix}`;
    if (value.maxPrice) return `${sym}${Number(value.maxPrice).toLocaleString()} ${t('filter_up_to')}${suffix}`;
    return labels.any;
  };

  const areaSummary = () => {
    if (value.minSqm && value.maxSqm) return `${value.minSqm}–${value.maxSqm} ${t('sqm_unit_short')}`;
    if (value.minSqm) return `${value.minSqm}+ ${t('sqm_unit_short')}`;
    if (value.maxSqm) return `${value.maxSqm} ${t('filter_sqm_up_to')}`;
    return labels.any;
  };

  const citySummary = () => {
    const parts: string[] = [];
    if (value.city) parts.push(value.city);
    if (value.tbilisiDistrict) parts.push(value.tbilisiDistrict);
    if (parts.length > 0) return parts.join(', ');
    if (value.region === 'tbilisi' && !value.city) return TBILISI_SURROUNDINGS_LABEL;
    if (value.region) {
      const region = GEORGIAN_REGIONS.find((r) => r.value === value.region);
      return region ? t(region.key) : value.region;
    }
    return labels.any;
  };

  const applyRegionChange = (newRegion: string) => {
    const newValue = { ...value, region: newRegion };
    if (newValue.city && newRegion) {
      const cityRegion = CITY_REGION_MAP[newValue.city];
      if (cityRegion && cityRegion !== newRegion) {
        newValue.city = '';
        newValue.tbilisiDistrict = '';
        newValue.tbilisiSubdistricts = [];
      }
    }
    if (newRegion === 'tbilisi' && !newValue.city) newValue.city = 'თბილისი';
    onChange(newValue);
  };

  const applyCityChange = (v: string) => {
    const newValue = { ...value, city: v };
    if (!v) {
      newValue.tbilisiDistrict = '';
      newValue.tbilisiSubdistricts = [];
    } else {
      const autoRegion = CITY_REGION_MAP[v] || '';
      if (autoRegion) newValue.region = autoRegion;
      if (!CITIES_WITH_DISTRICTS.includes(v)) {
        newValue.tbilisiDistrict = '';
        newValue.tbilisiSubdistricts = [];
      }
    }
    onChange(newValue);
  };

  const renderLocationFilters = () => (
    <div className="space-y-3">
      <select
        className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
          value.region
            ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-amber-500/60 dark:bg-amber-950/35 dark:text-amber-300'
            : 'border-slate-200 bg-white text-slate-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200'
        }`}
        value={value.region}
        onChange={(e) => applyRegionChange(e.target.value)}
      >
        <option value="">
          {labels.region}: {labels.any}
        </option>
        {GEORGIAN_REGIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {t(r.key)}
          </option>
        ))}
      </select>
      <CityCombobox
        value={value.city}
        label={labels.city}
        anyLabel={labels.any}
        allowedCities={
          value.region
            ? Object.entries(CITY_REGION_MAP)
                .filter(([, r]) => r === value.region)
                .map(([c]) => c)
            : undefined
        }
        onChange={applyCityChange}
      />
      {CITIES_WITH_DISTRICTS.includes(value.city) && (
        <TbilisiDistrictSelector
          city={value.city}
          selectedDistrict={value.tbilisiDistrict}
          selectedSubdistricts={value.tbilisiSubdistricts}
          onDistrictChange={(d) => onChange({ ...value, tbilisiDistrict: d })}
          onSubdistrictsChange={(s) => onChange({ ...value, tbilisiSubdistricts: s })}
        />
      )}
    </div>
  );

  const yearSummary = () => {
    const parts: string[] = [];
    if (value.buildingStatus.length > 0) {
      parts.push(
        value.buildingStatus.map((s) => t(`building_status_${s}`)).join(', ')
      );
    }
    if ((value.landStatus?.length || 0) > 0) {
      parts.push(
        value.landStatus.map((s) => t(`land_status_${s}`)).join(', ')
      );
    }
    const built =
      value.minConstructionYear || value.maxConstructionYear
        ? `${value.minConstructionYear || '—'}-${value.maxConstructionYear || '—'}`
        : '';
    const renovated =
      value.minRenovationYear || value.maxRenovationYear
        ? `${value.minRenovationYear || '—'}-${value.maxRenovationYear || '—'}`
        : '';
    if (built) parts.push(`აშენება: ${built}`);
    if (renovated) parts.push(`რემონტი: ${renovated}`);
    if (parts.length) return parts.join(' · ');
    return labels.any;
  };

  const priceActive = !!(value.minPrice || value.maxPrice || value.priceType === 'per_sqm');
  const roomsActive = value.rooms.length > 0;
  const bedroomsActive = value.bedrooms.length > 0;
  const balconiesActive = value.balconies.length > 0;
  const selectedRoomNums = value.rooms.map((r) => Number(r)).filter((n) => !Number.isNaN(n));
  const maxAllowedBedrooms = selectedRoomNums.length > 0 ? Math.max(...selectedRoomNums) : null;
  const hasOpenEndedRooms = value.rooms.includes('6');
  const areaActive = !!(value.minSqm || value.maxSqm);
  const cityActive = !!(
    value.city ||
    value.region ||
    value.tbilisiDistrict ||
    (value.tbilisiSubdistricts?.length || 0) > 0
  );
  const yearActive = !!(
    value.minConstructionYear ||
    value.maxConstructionYear ||
    value.minRenovationYear ||
    value.maxRenovationYear ||
    value.buildingStatus.length ||
    (value.landStatus?.length || 0) > 0
  );
  const comfortActive =
    (value.amenities?.length || 0) > 0 || value.has3d === 'true' || value.hasPhotos === 'true';

  const clearPriceFilter = () =>
    onChange({ ...value, minPrice: '', maxPrice: '', priceCurrency: 'USD', priceType: 'total' });
  const clearAreaFilter = () => onChange({ ...value, minSqm: '', maxSqm: '' });
  const clearCityFilter = () =>
    onChange({
      ...value,
      city: '',
      region: '',
      tbilisiDistrict: '',
      tbilisiSubdistricts: [],
    });
  const clearRoomsFilter = () =>
    onChange({ ...value, rooms: [], bedrooms: [], balconies: [] });
  const clearYearFilter = () =>
    onChange({
      ...value,
      minConstructionYear: '',
      maxConstructionYear: '',
      minRenovationYear: '',
      maxRenovationYear: '',
      buildingStatus: [],
      landStatus: [],
    });
  const clearComfortFilter = () =>
    onChange({ ...value, amenities: [], has3d: '', hasPhotos: '' });
  const clearBuildingProjectFilter = () => onChange({ ...value, buildingProject: [] });
  const clearRenovationFilter = () => onChange({ ...value, renovationStatus: [] });

  const activePriceType = resolvePriceFilterType(value.priceType);
  const priceCurrencySymbol = value.priceCurrency === 'GEL' ? '₾' : '$';
  const activePriceCurrency = (value.priceCurrency === 'GEL' ? 'GEL' : 'USD') as 'USD' | 'GEL';
  const formatPrice = (n: number) => `${priceCurrencySymbol}${Math.round(n).toLocaleString()}`;
  const formatArea = (n: number) => `${Math.round(n).toLocaleString()} ${t('sqm_unit_short')}`;

  const switchPriceCurrency = (next: 'USD' | 'GEL') => {
    if (activePriceCurrency === next) return;
    const convertVal = (v: string) => {
      if (!v) return '';
      const n = Number(v);
      if (!Number.isFinite(n)) return '';
      return next === 'GEL' ? String(Math.round(n * usdToGel)) : String(Math.round(n / usdToGel));
    };
    onChange({
      ...value,
      priceCurrency: next,
      minPrice: convertVal(value.minPrice),
      maxPrice: convertVal(value.maxPrice),
    });
  };

  const handlePriceSlider = (minVal: number, maxVal: number) => {
    if (!priceSliderBounds) return;
    const { min: dataMin, max: dataMax } = priceSliderBounds;
    onChange({
      ...value,
      priceType: activePriceType,
      minPrice: minVal <= dataMin ? '' : String(minVal),
      maxPrice: maxVal >= dataMax ? '' : String(maxVal),
    });
  };

  const handleAreaSlider = (minVal: number, maxVal: number) => {
    if (!areaSliderBounds) return;
    const { min: dataMin, max: dataMax } = areaSliderBounds;
    onChange({
      ...value,
      minSqm: minVal <= dataMin ? '' : String(minVal),
      maxSqm: maxVal >= dataMax ? '' : String(maxVal),
    });
  };

  const commitPriceField = (field: 'minPrice' | 'maxPrice', raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange({ ...value, priceType: activePriceType, [field]: '' });
      return;
    }
    const n = Math.round(Number(trimmed));
    if (!Number.isFinite(n) || n < 0) {
      onChange({ ...value, priceType: activePriceType, [field]: '' });
      return;
    }
    let nextMin = field === 'minPrice' ? String(n) : value.minPrice;
    let nextMax = field === 'maxPrice' ? String(n) : value.maxPrice;
    if (nextMin && nextMax && Number(nextMin) > Number(nextMax)) {
      if (field === 'minPrice') nextMax = nextMin;
      else nextMin = nextMax;
    }
    onChange({ ...value, priceType: activePriceType, minPrice: nextMin, maxPrice: nextMax });
  };

  const commitAreaField = (field: 'minSqm' | 'maxSqm', raw: string) => {
    if (!areaSliderBounds) return;
    const { min, max, step } = areaSliderBounds;
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange({ ...value, [field]: '' });
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      onChange({ ...value, [field]: '' });
      return;
    }
    const clamped = clampToStep(n, min, max, step);
    if (field === 'minSqm') {
      onChange({ ...value, minSqm: clamped <= min ? '' : String(clamped) });
    } else {
      onChange({ ...value, maxSqm: clamped >= max ? '' : String(clamped) });
    }
  };

  const rangeInputClass =
    'w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100';

  const dropdownInputClass =
    'w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100';

  const renderPriceDropdownContent = () => (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_currency')}</div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => switchPriceCurrency('USD')}
            className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
              activePriceCurrency === 'USD'
                ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            $ USD
          </button>
          <button
            type="button"
            onClick={() => switchPriceCurrency('GEL')}
            className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
              activePriceCurrency === 'GEL'
                ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            ₾ GEL
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_price_type')}</div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...value, priceType: 'total' })}
            className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
              activePriceType === 'total'
                ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            {t('filter_total')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, priceType: 'per_sqm' })}
            className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
              activePriceType === 'per_sqm'
                ? 'border-blue-600 bg-blue-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            {t('filter_per_sqm')}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_minimum')}</label>
          <input
            type="number"
            className={dropdownInputClass}
            placeholder="0"
            value={value.minPrice}
            onChange={(e) => onChange({ ...value, priceType: activePriceType, minPrice: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_maximum')}</label>
          <input
            type="number"
            className={dropdownInputClass}
            placeholder="∞"
            value={value.maxPrice}
            onChange={(e) => onChange({ ...value, priceType: activePriceType, maxPrice: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {[50000, 100000, 200000, 500000].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...value, priceType: activePriceType, maxPrice: String(p) })}
            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
          >
            {p / 1000}K {t('filter_up_to')}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAreaDropdownContent = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_min_sqm')}</label>
          <input
            type="number"
            className={dropdownInputClass}
            placeholder="0"
            value={value.minSqm}
            onChange={(e) => set('minSqm', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_max_sqm')}</label>
          <input
            type="number"
            className={dropdownInputClass}
            placeholder="∞"
            value={value.maxSqm}
            onChange={(e) => set('maxSqm', e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {[50, 100, 150, 200].map((sqm) => (
          <button
            key={sqm}
            type="button"
            onClick={() => set('maxSqm', String(sqm))}
            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
          >
            {sqm} {t('filter_sqm_up_to')}
          </button>
        ))}
      </div>
    </div>
  );

  const renderRoomsDropdownContent = () => (
    <div className="space-y-3">
      <div className="mb-2 text-xs text-slate-500">{t('filter_choose_rooms')}</div>
      <div className="flex gap-1.5">
        {['1', '2', '3', '4', '5', '6'].map((r) => {
          const isSelected = value.rooms.includes(r);
          const displayLabel = r === '6' ? '6+' : r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                const nextRooms = isSelected
                  ? value.rooms.filter((room) => room !== r)
                  : [...value.rooms, r].sort((a, b) => Number(a) - Number(b));
                const nextRoomNums = nextRooms.map((room) => Number(room)).filter((n) => !Number.isNaN(n));
                const maxRoom = nextRoomNums.length > 0 ? Math.max(...nextRoomNums) : null;
                const openEnded = nextRooms.includes('6');
                const nextBedrooms = value.bedrooms.filter((b) => {
                  if (openEnded) return true;
                  if (maxRoom === null) return false;
                  return Number(b) <= maxRoom;
                });
                onChange({ ...value, rooms: nextRooms, bedrooms: nextBedrooms });
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="mb-2 text-xs text-slate-500">{t('filter_choose_bedrooms')}</div>
        <div className="flex gap-1.5">
          {['1', '2', '3', '4', '5', '6'].map((r) => {
            const isSelected = value.bedrooms.includes(r);
            const roomNumber = Number(r);
            const isDisabled =
              !hasOpenEndedRooms && maxAllowedBedrooms !== null && roomNumber > maxAllowedBedrooms;
            const displayLabel = r === '6' ? '6+' : r;
            return (
              <button
                key={r}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  const nextBedrooms = isSelected
                    ? value.bedrooms.filter((bedroom) => bedroom !== r)
                    : [...value.bedrooms, r].sort((a, b) => Number(a) - Number(b));
                  onChange({ ...value, bedrooms: nextBedrooms });
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  isDisabled
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
                    : isSelected
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="mb-2 text-xs text-slate-500">{t('filter_balcony_count')}</div>
        <div className="flex gap-1.5">
          {['1', '2', '3'].map((b) => {
            const isSelected = value.balconies.includes(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? value.balconies.filter((x) => x !== b)
                    : [...value.balconies, b].sort((a, c) => Number(a) - Number(c));
                  onChange({ ...value, balconies: next });
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700'
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderPriceFilterPanel = () => (
    <div className="flex flex-1 flex-col">
      {priceSliderValues && priceHistogram ? (
        <>
          <div className="flex-1">
            <HistogramRangeSlider
              min={priceSliderValues.min}
              max={priceSliderValues.max}
              step={priceSliderValues.step}
              valueMin={priceSliderValues.curMin}
              valueMax={priceSliderValues.curMax}
              histogram={priceHistogram}
              onChange={handlePriceSlider}
              formatValue={formatPrice}
              showRangeLabel={false}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_minimum')}</label>
              <input
                type="number"
                className={rangeInputClass}
                placeholder={String(priceSliderValues.min)}
                value={value.minPrice}
                onChange={(e) => onChange({ ...value, priceType: activePriceType, minPrice: e.target.value })}
                onBlur={(e) => commitPriceField('minPrice', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_maximum')}</label>
              <input
                type="number"
                className={rangeInputClass}
                placeholder={String(priceSliderValues.max)}
                value={value.maxPrice}
                onChange={(e) => onChange({ ...value, priceType: activePriceType, maxPrice: e.target.value })}
                onBlur={(e) => commitPriceField('maxPrice', e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 dark:text-zinc-400">{labels.any}</p>
      )}
    </div>
  );

  const renderAreaFilterPanel = () => (
    <div className="flex flex-1 flex-col">
      {areaSliderValues && areaHistogram ? (
        <>
          <div className="flex-1">
            <HistogramRangeSlider
              min={areaSliderValues.min}
              max={areaSliderValues.max}
              step={areaSliderValues.step}
              valueMin={areaSliderValues.curMin}
              valueMax={areaSliderValues.curMax}
              histogram={areaHistogram}
              onChange={handleAreaSlider}
              formatValue={formatArea}
              showRangeLabel={false}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_min_sqm')}</label>
              <input
                type="number"
                className={rangeInputClass}
                placeholder={String(areaSliderValues.min)}
                value={value.minSqm}
                onChange={(e) => set('minSqm', e.target.value)}
                onBlur={(e) => commitAreaField('minSqm', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-slate-500 dark:text-zinc-400">{t('filter_max_sqm')}</label>
              <input
                type="number"
                className={rangeInputClass}
                placeholder={String(areaSliderValues.max)}
                value={value.maxSqm}
                onChange={(e) => set('maxSqm', e.target.value)}
                onBlur={(e) => commitAreaField('maxSqm', e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {[50, 100, 150, 200].map((sqm) => (
              <button
                key={sqm}
                type="button"
                onClick={() => commitAreaField('maxSqm', String(sqm))}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
              >
                {sqm} {t('filter_sqm_up_to')}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 dark:text-zinc-400">{labels.any}</p>
      )}
    </div>
  );

  const inlineRangePanelClass =
    'flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900/80';
  const inlineRangeHeaderClass = 'mb-2 flex min-h-[2.25rem] flex-wrap items-center gap-x-2 gap-y-1';
  const compactGridClass = mapSidebar
    ? 'mb-3 grid grid-cols-1 gap-2'
    : 'mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5';
  const mainFiltersRowClass = mapSidebar
    ? 'mb-3 grid grid-cols-1 gap-2'
    : compactGridClass;
  const compactFilterItemClass = mapSidebar ? '' : '';

  const extendedOnlyActiveCount =
    (!!(
      committed.minConstructionYear ||
      committed.maxConstructionYear ||
      committed.minRenovationYear ||
      committed.maxRenovationYear ||
      (committed.buildingStatus?.length || 0) ||
      (committed.landStatus?.length || 0)
    )
      ? 1
      : 0) +
    (committed.has3d === 'true' ? 1 : 0) +
    (committed.hasPhotos === 'true' ? 1 : 0) +
    (committed.amenities?.length || 0) +
    committed.buildingProject.length +
    committed.renovationStatus.length;

  const renderSearchField = (wrapperClassName: string) => (
    <HeroSearchField
      wrapperClassName={wrapperClassName}
      heroCompact={heroCompact}
      heroSearchStyle={heroSearchStyle}
      placeholder={labels.search_placeholder}
      value={value.q || value.propertyId || ''}
      onChange={(next) => onChange({ ...value, ...next })}
      onSearch={heroCompact ? publishHeroSearch : undefined}
    />
  );

  const renderHeroSearchButton = (fullWidth: boolean) => {
    const sub = resolveSearchControl(
      heroSearchStyle || heroSearchStyleRaw || DEFAULT_SEARCH,
      'submit'
    );
    const button = (
      <button
        type="button"
        onClick={publishHeroSearch}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400 ${
          fullWidth
            ? 'min-h-11 w-full rounded-xl px-4 text-sm'
            : heroSearchStyle
              ? 'h-full w-full self-center'
              : 'min-h-12 shrink-0 self-center rounded-lg px-4 text-sm'
        }`}
        style={
          heroSearchStyle && !fullWidth
            ? {
                minHeight: sub.h,
                height: '100%',
                paddingLeft: heroSearchStyle.buttonPadX,
                paddingRight: heroSearchStyle.buttonPadX,
                borderRadius: heroSearchStyle.buttonBorderRadius,
                fontSize: heroSearchStyle.buttonFontSize || heroSearchStyle.labelFontSize,
                fontWeight: heroSearchStyle.buttonFontWeight || 600,
              }
            : undefined
        }
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>{labels.search}</span>
      </button>
    );
    if (fullWidth) return button;
    return (
      <SearchControlShell id="submit" className="ml-auto hidden self-center md:block">
        {button}
      </SearchControlShell>
    );
  };

  return (
    <HeroSearchStyleContext.Provider value={heroSearchStyle}>
    <FilterDropdownLayoutContext.Provider value={{ inline: mapSidebar || forceExpanded }}>
    <div
      className={
        mapSidebar
          ? 'block'
          : heroCompact
            ? 'flex h-full w-full flex-col justify-center overflow-visible'
            : 'rounded-lg border border-slate-200 bg-white p-3 md:p-4 dark:border-zinc-700 dark:bg-zinc-900'
      }
      suppressHydrationWarning
    >
      {/* მობაილზე ძიება + გასუფთავება */}
      {!mapSidebar && !heroCompact && !hideDealAndSearch && (
        <div className="mb-3 flex items-center gap-2 md:hidden">
          {renderSearchField('relative min-w-0 flex-1')}
          {onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              disabled={activeFilterCount === 0}
              aria-label={labels.clear_filters}
              className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border transition-colors ${
                activeFilterCount > 0
                  ? 'border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-60'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      )}

      {/* მობაილზე — დანარჩენი ფილტრები; mapSidebar-ზე ყოველთვის ხილულია */}
      {!mapSidebar && !heroCompact && !forceExpanded && (
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden w-full flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>{labels.filters}</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center dark:bg-amber-500 dark:text-black">
                {activeFilterCount}
              </span>
            )}
          </div>
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      <div
        className={
          mapSidebar || forceExpanded
            ? 'block'
            : heroCompact
              ? 'flex h-full w-full flex-col justify-center overflow-visible'
              : `${mobileOpen ? 'block mt-3 pt-3 border-t border-slate-100 dark:border-zinc-700' : 'hidden'} md:block md:mt-0 md:pt-0 md:border-0`
        }
      >
      {(mapSidebar || showCategories) && (
        <div className="mb-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
            {t('categories')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROPERTY_TYPE_CHIPS.map((cat) => {
              const isSelected = value.type.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  type="button"
                  title={t(cat.key)}
                  onClick={() => {
                    const nextType = isSelected
                      ? value.type.filter((x) => x !== cat.value)
                      : [...value.type, cat.value];
                    const landOnly =
                      nextType.length === 1 && nextType[0] === 'land';
                    const includesLand = nextType.includes('land');
                    const nextAmenities = landOnly
                      ? (value.amenities || []).filter(
                          (a) => a !== 'basement' && a !== 'attic'
                        )
                      : value.amenities;
                    onChange({
                      ...value,
                      type: nextType,
                      amenities: nextAmenities,
                      buildingStatus: landOnly ? [] : value.buildingStatus,
                      landStatus: includesLand ? value.landStatus || [] : [],
                    });
                  }}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="max-w-[5.5rem] truncate">{t(cat.key)}</span>
                </button>
              );
            })}
          </div>
          {value.type.includes('land') && (
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                {t('filter_land_status')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LAND_STATUS_OPTIONS.map((item) => {
                  const selected = (value.landStatus || []).includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...value,
                          landStatus: selected
                            ? (value.landStatus || []).filter((s) => s !== item.value)
                            : [...(value.landStatus || []), item.value],
                        })
                      }
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500'
                      }`}
                    >
                      {t(item.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ჰერო: desktop — ერთი რიგი (CSS md:); მობილური — ერთნაირი ბარათები */}
      {!hideDealAndSearch && heroCompact && (
        <div
          className="flex w-full min-w-0 flex-col md:h-full md:justify-center md:overflow-visible md:gap-1.5 max-md:[gap:var(--stack-gap)]"
          style={
            {
              '--stack-gap': `${design?.layout.hero.mobileStackGap ?? 4}px`,
            } as React.CSSProperties
          }
        >
          <div className="md:hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
              {renderSearchField('relative min-w-0 w-full')}
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              aria-expanded={mobileOpen}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden>🔍</span>
                <span>{labels.filters}</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white dark:bg-amber-500 dark:text-black">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <svg
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div
            className={`${
              mobileOpen ? 'max-md:grid' : 'max-md:hidden'
            } max-md:w-full max-md:min-w-0 max-md:grid-cols-2 max-md:gap-2 max-md:rounded-xl max-md:border max-md:border-slate-200 max-md:bg-white max-md:p-3 dark:max-md:border-zinc-700 dark:max-md:bg-zinc-900 md:flex md:min-h-0 md:w-full md:min-w-0 md:flex-wrap md:items-center md:overflow-visible md:[gap:var(--search-gap)]`}
            style={
              {
                '--search-gap': `${heroSearchStyle?.gap ?? 8}px`,
              } as React.CSSProperties
            }
          >
            {(
              [
                {
                  key: 'price' as const,
                  node: (
                    <FilterDropdown
                      label={t('filter_price')}
                      summary={priceSummary()}
                      isActive={priceActive}
                      onClear={clearPriceFilter}
                    >
                      {renderPriceDropdownContent()}
                    </FilterDropdown>
                  ),
                },
                {
                  key: 'area' as const,
                  node: (
                    <FilterDropdown
                      label={t('filter_area')}
                      summary={areaSummary()}
                      isActive={areaActive}
                      onClear={clearAreaFilter}
                    >
                      {renderAreaDropdownContent()}
                    </FilterDropdown>
                  ),
                },
                {
                  key: 'city' as const,
                  node: (
                    <LocationFilterTrigger
                      label={labels.city}
                      summary={citySummary()}
                      isActive={cityActive}
                      onClear={clearCityFilter}
                      onOpen={() => setLocationModalOpen(true)}
                    />
                  ),
                },
                {
                  key: 'rooms' as const,
                  node: (
                    <FilterDropdown
                      label={t('filter_rooms')}
                      summary={roomsSummary()}
                      isActive={roomsActive || bedroomsActive || balconiesActive}
                      onClear={clearRoomsFilter}
                    >
                      {renderRoomsDropdownContent()}
                    </FilterDropdown>
                  ),
                },
              ] as const
            ).map((item) => {
              const ctrl = resolveSearchControl(
                heroSearchStyle || heroSearchStyleRaw || DEFAULT_SEARCH,
                item.key
              );
              return (
                <SearchControlShell key={item.key} id={item.key} className="max-md:min-w-0 max-md:w-full">
                  <SearchControlMetricsContext.Provider value={{ h: ctrl.h }}>
                    {item.node}
                  </SearchControlMetricsContext.Provider>
                </SearchControlShell>
              );
            })}
            <SearchControlShell id="query" className="hidden self-center md:block">
              <SearchControlMetricsContext.Provider
                value={{
                  h: resolveSearchControl(
                    heroSearchStyle || heroSearchStyleRaw || DEFAULT_SEARCH,
                    'query'
                  ).h,
                }}
              >
                {renderSearchField('relative min-w-0 h-full w-full self-center')}
              </SearchControlMetricsContext.Provider>
            </SearchControlShell>
            {(() => {
              const adv = resolveSearchControl(
                heroSearchStyle || heroSearchStyleRaw || DEFAULT_SEARCH,
                'advanced'
              );
              const button = (
                <button
                  type="button"
                  onClick={openExtendedSearch}
                  className={`inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap border transition-all max-md:col-span-2 max-md:w-full md:shrink-0 md:self-center ${
                    heroSearchStyle
                      ? 'overflow-visible leading-tight'
                      : 'min-h-12 rounded-lg px-3 py-2.5 text-sm font-medium leading-tight'
                  } ${
                    extendedOnlyActiveCount > 0 || activeFilterCount > 0
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-amber-500/60 dark:bg-amber-950/35 dark:text-amber-300'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
                  }`}
                  style={
                    heroSearchStyle
                      ? (() => {
                          const fontSize =
                            heroSearchStyle.buttonFontSize || heroSearchStyle.labelFontSize;
                          const padY = Math.max(8, Math.round((heroSearchStyle.triggerPadY ?? 12) * 0.75));
                          return {
                            minHeight: adv.h,
                            height: '100%',
                            paddingLeft: heroSearchStyle.buttonPadX,
                            paddingRight: heroSearchStyle.buttonPadX,
                            paddingTop: padY,
                            paddingBottom: padY,
                            borderRadius: heroSearchStyle.buttonBorderRadius,
                            borderColor:
                              extendedOnlyActiveCount > 0 || activeFilterCount > 0
                                ? undefined
                                : heroSearchStyle.buttonBorderColor,
                            backgroundColor:
                              extendedOnlyActiveCount > 0 || activeFilterCount > 0
                                ? undefined
                                : heroSearchStyle.buttonBackground,
                            color:
                              extendedOnlyActiveCount > 0 || activeFilterCount > 0
                                ? undefined
                                : heroSearchStyle.buttonColor || heroSearchStyle.labelColor,
                            fontSize,
                            fontWeight:
                              heroSearchStyle.buttonFontWeight || heroSearchStyle.labelFontWeight,
                            lineHeight: 1.35,
                            overflow: 'visible',
                          } as React.CSSProperties;
                        })()
                      : undefined
                  }
                >
                  <span className="block overflow-visible pb-[0.12em] leading-[1.35]">
                    {labels.extended_search}
                  </span>
                  {(extendedOnlyActiveCount > 0 || activeFilterCount > 0) && (
                    <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold leading-none text-white dark:bg-amber-500 dark:text-black">
                      {Math.max(extendedOnlyActiveCount, activeFilterCount)}
                    </span>
                  )}
                </button>
              );
              return <SearchControlShell id="advanced">{button}</SearchControlShell>;
            })()}
            {renderHeroSearchButton(false)}
          </div>
          <div className="mt-2 md:hidden">{renderHeroSearchButton(true)}</div>
        </div>
      )}

      {!hideDealAndSearch && !heroCompact && (
      <div
        className={`flex gap-2 ${
          mapSidebar
            ? 'mb-3 flex-col'
            : 'mb-3 flex-col md:flex-row md:flex-wrap md:items-center md:gap-3'
        }`}
      >
        <div
          className={`flex shrink-0 items-center gap-2 ${
            mapSidebar
              ? 'order-2 flex-wrap'
              : 'order-2 flex-wrap md:order-1 md:flex-nowrap'
          }`}
        >
          {DEAL_TYPES.map((dt) => {
            const isSelected = value.dealType.includes(dt.value);
            return (
              <button
                key={dt.value}
                type="button"
                onClick={() => {
                  const newDealType = isSelected
                    ? value.dealType.filter((d) => d !== dt.value)
                    : [...value.dealType, dt.value];
                  onChange({ ...value, dealType: newDealType });
                }}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium leading-none transition-all sm:px-4 py-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span className="inline-flex items-center leading-none" aria-hidden>
                  {dt.icon}
                </span>
                <span className="inline-flex items-center leading-none">{t(dt.key)}</span>
              </button>
            );
          })}
        </div>
        {renderSearchField(
          mapSidebar
            ? 'relative order-1 min-w-0 w-full'
            : 'relative order-1 hidden min-w-0 w-full md:order-2 md:block md:min-w-[10rem] md:flex-1'
        )}
        {!mapSidebar && onClearAll ? (
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeFilterCount === 0}
            className={`order-3 hidden shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors md:order-3 md:flex ${
              activeFilterCount > 0
                ? 'border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-300'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-60 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-600'
            }`}
            title={labels.clear_filters}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="whitespace-nowrap">{labels.clear_filters}</span>
          </button>
        ) : null}
      </div>
      )}

      {/* მთავარი ფილტრები: ფასი, ფართობი, ქალაქი, ოთახები, გაფართოებული */}
      {!heroCompact && (
      <div className={mainFiltersRowClass}>
        {mapSidebar ? (
          <>
            <div className={inlineRangePanelClass}>
              <div className={inlineRangeHeaderClass}>
                <span className="shrink-0 text-xs font-semibold text-slate-800 dark:text-zinc-100">{t('filter_price')}</span>
                <div className="flex flex-wrap items-center gap-1">
                  <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-600">
                    <button
                      type="button"
                      onClick={() => switchPriceCurrency('USD')}
                      className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        activePriceCurrency === 'USD'
                          ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-black'
                          : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-300'
                      }`}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      onClick={() => switchPriceCurrency('GEL')}
                      className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        activePriceCurrency === 'GEL'
                          ? 'bg-blue-600 text-white dark:bg-amber-500 dark:text-black'
                          : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-300'
                      }`}
                    >
                      ₾
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, priceType: 'total' })}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      activePriceType === 'total'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-slate-200 text-slate-600 dark:border-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {t('filter_total')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, priceType: 'per_sqm' })}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      activePriceType === 'per_sqm'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-slate-200 text-slate-600 dark:border-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {t('filter_per_sqm')}
                  </button>
                </div>
                {priceActive ? (
                  <button
                    type="button"
                    onClick={clearPriceFilter}
                    className="ml-auto text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={t('clear_filters')}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              {renderPriceFilterPanel()}
            </div>

            <div className={inlineRangePanelClass}>
              <div className={inlineRangeHeaderClass}>
                <span className="shrink-0 text-xs font-semibold text-slate-800 dark:text-zinc-100">{t('filter_area')}</span>
                <span className="flex-1" aria-hidden />
                {areaActive ? (
                  <button
                    type="button"
                    onClick={clearAreaFilter}
                    className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={t('clear_filters')}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              {renderAreaFilterPanel()}
            </div>
          </>
        ) : (
          <>
            <FilterDropdown label={t('filter_price')} summary={priceSummary()} isActive={priceActive} onClear={clearPriceFilter}>
              {renderPriceDropdownContent()}
            </FilterDropdown>

            <FilterDropdown label={t('filter_area')} summary={areaSummary()} isActive={areaActive} onClear={clearAreaFilter}>
              {renderAreaDropdownContent()}
            </FilterDropdown>
          </>
        )}

        <div className={compactFilterItemClass}>
        {/* ქალაქი — მოდალი (მთავარი გვერდი) / dropdown (რუკა) */}
        {mapSidebar ? (
          <FilterDropdown label={labels.city} summary={citySummary()} isActive={cityActive} onClear={clearCityFilter}>
            {renderLocationFilters()}
          </FilterDropdown>
        ) : (
          <LocationFilterTrigger
            label={labels.city}
            summary={citySummary()}
            isActive={cityActive}
            onClear={clearCityFilter}
            onOpen={() => setLocationModalOpen(true)}
          />
        )}
        </div>

        <div className={compactFilterItemClass}>
        {/* ოთახები dropdown */}
        <FilterDropdown label={t('filter_rooms')} summary={roomsSummary()} isActive={roomsActive || bedroomsActive || balconiesActive} onClear={clearRoomsFilter}>
          {renderRoomsDropdownContent()}
        </FilterDropdown>
        </div>

        <div className={compactFilterItemClass}>
        <button
          type="button"
          onClick={openExtendedSearch}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
            extendedOnlyActiveCount > 0
              ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-amber-500/60 dark:bg-amber-950/35 dark:text-amber-300'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 text-left">
            <span className="text-base" aria-hidden>
              ⚙️
            </span>
            <span className="truncate">{labels.extended_search}</span>
            {extendedOnlyActiveCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center dark:bg-amber-500 dark:text-black">
                {extendedOnlyActiveCount}
              </span>
            )}
          </div>
          <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        </div>
      </div>

      )}

      <ExtendedSearchModal
        open={extendedOpen}
        onClose={discardExtendedSearch}
        onApply={applyExtendedSearch}
        title={labels.extended_search}
        closeLabel={labels.close}
        applyLabel={t('extended_search_apply')}
      >
        <FilterDropdownLayoutContext.Provider value={{ inline: true, spacious: true }}>
          <div className="mx-auto w-full max-w-4xl space-y-3">
              {heroCompact && (
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  {mounted
                    ? `${t('filter_price')} · ${t('filter_area')} · ${labels.city} · ${t('filter_rooms')} · ${t('categories')}`
                    : 'ფასი · ფართობი · ქალაქი · ოთახები · კატეგორიები'}
                </p>
              )}
              {heroCompact && (
                <div className={compactGridClass}>
                  {/* ფასი / ფართობი / ქალაქი / ოთახები — ჰერო რეჟიმში მხოლოდ მოდალში */}
                  <div className={compactFilterItemClass}>
                    <FilterDropdown
                      label={t('filter_price')}
                      summary={
                        value.minPrice || value.maxPrice
                          ? `${value.minPrice || '…'} – ${value.maxPrice || '…'} ${value.priceCurrency || 'USD'}`
                          : labels.any
                      }
                      isActive={!!(value.minPrice || value.maxPrice)}
                      onClear={() => onChange({ ...value, minPrice: '', maxPrice: '' })}
                      defaultOpen
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                          value={value.minPrice}
                          onChange={(e) => onChange({ ...value, minPrice: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                          value={value.maxPrice}
                          onChange={(e) => onChange({ ...value, maxPrice: e.target.value })}
                        />
                      </div>
                    </FilterDropdown>
                  </div>
                  <div className={compactFilterItemClass}>
                    <FilterDropdown
                      label={t('filter_area')}
                      summary={
                        value.minSqm || value.maxSqm
                          ? `${value.minSqm || '…'} – ${value.maxSqm || '…'} მ²`
                          : labels.any
                      }
                      isActive={!!(value.minSqm || value.maxSqm)}
                      onClear={() => onChange({ ...value, minSqm: '', maxSqm: '' })}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                          value={value.minSqm}
                          onChange={(e) => onChange({ ...value, minSqm: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                          value={value.maxSqm}
                          onChange={(e) => onChange({ ...value, maxSqm: e.target.value })}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {[50, 100, 150, 200].map((sqm) => (
                          <button
                            key={sqm}
                            type="button"
                            onClick={() => onChange({ ...value, maxSqm: String(sqm) })}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-950/50 dark:hover:text-amber-300"
                          >
                            {sqm} {t('filter_sqm_up_to')}
                          </button>
                        ))}
                      </div>
                    </FilterDropdown>
                  </div>
                  <div className={compactFilterItemClass}>
                    <LocationFilterTrigger
                      label={labels.city}
                      summary={citySummary()}
                      isActive={cityActive}
                      onClear={clearCityFilter}
                      onOpen={() => setLocationModalOpen(true)}
                    />
                  </div>
                  <div className={compactFilterItemClass}>
                    <FilterDropdown
                      label={t('filter_rooms')}
                      summary={roomsSummary()}
                      isActive={roomsActive || bedroomsActive || balconiesActive}
                      onClear={clearRoomsFilter}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {['1', '2', '3', '4', '5', '6'].map((r) => {
                          const isSelected = value.rooms.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                const nextRooms = isSelected
                                  ? value.rooms.filter((room) => room !== r)
                                  : [...value.rooms, r];
                                onChange({ ...value, rooms: nextRooms });
                              }}
                              className={`min-w-[2.5rem] rounded-lg px-2 py-2 text-sm font-medium ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {r === '6' ? '6+' : r}
                            </button>
                          );
                        })}
                      </div>
                    </FilterDropdown>
                  </div>
                  <div className="col-span-full">
                    <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {t('categories')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PROPERTY_TYPE_CHIPS.map((cat) => {
                        const isSelected = value.type.includes(cat.value);
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              const nextType = isSelected
                                ? value.type.filter((x) => x !== cat.value)
                                : [...value.type, cat.value];
                              onChange({
                                ...value,
                                type: nextType,
                                landStatus: nextType.includes('land') ? value.landStatus || [] : [],
                              });
                            }}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'border-slate-200 bg-white text-slate-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
                            }`}
                          >
                            {t(cat.key)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <FilterDropdown
                label="🏗️ აშენება/რემონტი"
                summary={yearSummary()}
                isActive={yearActive}
                onClear={clearYearFilter}
                defaultOpen
              >
                <div className="space-y-5">
                  {value.type.includes('land') && (
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700 dark:text-zinc-200">
                        {t('filter_land_status')}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {LAND_STATUS_OPTIONS.map((item) => {
                          const selected = (value.landStatus || []).includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...value,
                                  landStatus: selected
                                    ? (value.landStatus || []).filter((s) => s !== item.value)
                                    : [...(value.landStatus || []), item.value],
                                })
                              }
                              className={`rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all ${
                                selected
                                  ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm dark:border-emerald-400 dark:bg-emerald-500 dark:text-black'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500'
                              }`}
                            >
                              {t(item.labelKey)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {!(value.type.length === 1 && value.type[0] === 'land') && (
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700 dark:text-zinc-200">
                        {t('building_status_label')}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          { value: 'newly_built', key: 'building_status_newly_built' },
                          { value: 'under_construction', key: 'building_status_under_construction' },
                          { value: 'old_built', key: 'building_status_old_built' },
                        ].map((item) => {
                          const selected = value.buildingStatus.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...value,
                                  buildingStatus: selected
                                    ? value.buildingStatus.filter((s) => s !== item.value)
                                    : [...value.buildingStatus, item.value],
                                })
                              }
                              className={`rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all ${
                                selected
                                  ? 'border-blue-500 bg-blue-600 text-white shadow-sm dark:border-amber-400 dark:bg-amber-500 dark:text-black'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500'
                              }`}
                            >
                              {t(item.key)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700 dark:text-zinc-200">
                        აშენების წელი
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                          placeholder="დან"
                          value={value.minConstructionYear}
                          onChange={(e) => set('minConstructionYear', e.target.value)}
                        />
                        <input
                          type="number"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                          placeholder="მდე"
                          value={value.maxConstructionYear}
                          onChange={(e) => set('maxConstructionYear', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700 dark:text-zinc-200">
                        რემონტის წელი
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                          placeholder="დან"
                          value={value.minRenovationYear}
                          onChange={(e) => set('minRenovationYear', e.target.value)}
                        />
                        <input
                          type="number"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                          placeholder="მდე"
                          value={value.maxRenovationYear}
                          onChange={(e) => set('maxRenovationYear', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </FilterDropdown>

            <FilterDropdown
        label={t('filter_comfort')}
        summary={(() => {
          const count = (value.amenities?.length || 0)
            + (value.has3d === 'true' ? 1 : 0)
            + (value.hasPhotos === 'true' ? 1 : 0);
          return count > 0 ? `${count} ${t('filter_selected')}` : t('filter_choose');
        })()}
        isActive={comfortActive}
        onClear={clearComfortFilter}
      >
        <div className="grid max-h-[min(50vh,420px)] grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60">
            <input
              type="checkbox"
              checked={value.has3d === 'true'}
              onChange={() => set('has3d', value.has3d === 'true' ? '' : 'true')}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm sm:text-base">{t('has3d_filter')}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60">
            <input
              type="checkbox"
              checked={value.hasPhotos === 'true'}
              onChange={() => set('hasPhotos', value.hasPhotos === 'true' ? '' : 'true')}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm sm:text-base">{t('hasPhotos_filter')}</span>
          </label>
          <hr className="col-span-full my-1 border-slate-100 dark:border-zinc-800" />
          {(() => {
            const landOnlySelected =
              value.type.length === 1 && value.type[0] === 'land';
            const amenityOptions: { key: string; labelKey: string }[] = [
              { key: 'elevator', labelKey: 'amenity_filter_elevator' },
              { key: 'furniture', labelKey: 'amenity_filter_furniture' },
              { key: 'internet', labelKey: 'amenity_filter_internet' },
              { key: 'airConditioner', labelKey: 'amenity_filter_airConditioner' },
              { key: 'centralHeating', labelKey: 'amenity_filter_centralHeating' },
              { key: 'naturalGas', labelKey: 'amenity_filter_naturalGas' },
              { key: 'garage', labelKey: 'amenity_filter_garage' },
              { key: 'security', labelKey: 'amenity_filter_security' },
              { key: 'pool', labelKey: 'amenity_filter_pool' },
              { key: 'garden', labelKey: 'amenity_filter_garden' },
              { key: 'terrace', labelKey: 'terrace' },
              { key: 'isolatedKitchen', labelKey: 'amenity_filter_isolatedKitchen' },
              { key: 'heatingCooling', labelKey: 'amenity_filter_heatingCooling' },
              ...(!landOnlySelected
                ? [
                    { key: 'basement', labelKey: 'amenity_filter_basement' },
                    { key: 'attic', labelKey: 'amenity_filter_attic' },
                  ]
                : []),
              { key: 'storage', labelKey: 'amenity_filter_storage' },
              { key: 'electricity', labelKey: 'amenity_filter_electricity' },
              { key: 'water', labelKey: 'amenity_filter_water' },
              { key: 'fireplace', labelKey: 'amenity_filter_fireplace' },
            ];
            return amenityOptions.map(({ key, labelKey }) => {
            const amenities = value.amenities || [];
            const isSelected = amenities.includes(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    const newAmenities = isSelected
                      ? amenities.filter(a => a !== key)
                      : [...amenities, key];
                    onChange({ ...value, amenities: newAmenities });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm sm:text-base">{t(labelKey)}</span>
              </label>
            );
          });
          })()}
        </div>
      </FilterDropdown>

            {value.type.includes('apartment') && (
        <FilterDropdown
          label={`🏠 ${t('filter_project')}`}
          summary={value.buildingProject.length > 0 ? value.buildingProject.map(p => t(`project_${p}`)).join(', ') : ''}
          isActive={value.buildingProject.length > 0}
          onClear={clearBuildingProjectFilter}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { value: 'new_build', key: 'project_new_build' },
              { value: 'czech', key: 'project_czech' },
              { value: 'khrushchev', key: 'project_khrushchev' },
              { value: 'urban', key: 'project_urban' },
              { value: 'lvov', key: 'project_lvov' },
              { value: 'budapest', key: 'project_budapest' },
              { value: 'kiev', key: 'project_kiev' },
              { value: 'moscow', key: 'project_moscow' },
              { value: 'tbilisi', key: 'project_tbilisi' },
              { value: 'other', key: 'project_other' },
            ].map((proj) => (
              <button
                key={proj.value}
                type="button"
                onClick={() => onChange({ ...value, buildingProject: value.buildingProject.includes(proj.value) ? value.buildingProject.filter(p => p !== proj.value) : [...value.buildingProject, proj.value] })}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                  value.buildingProject.includes(proj.value)
                    ? 'border-blue-500 bg-blue-600 text-white shadow-sm dark:border-amber-400 dark:bg-amber-500 dark:text-black'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200'
                }`}
              >
                {t(proj.key)}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

            <FilterDropdown
        label={`🧱 ${t('filter_renovation')}`}
        summary={value.renovationStatus.length > 0 ? value.renovationStatus.map((s) => t(`renovation_${s}`)).join(', ') : labels.any}
        isActive={value.renovationStatus.length > 0}
        onClear={clearRenovationFilter}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { value: 'green_frame', key: 'renovation_green_frame' },
            { value: 'white_frame', key: 'renovation_white_frame' },
            { value: 'black_frame', key: 'renovation_black_frame' },
            { value: 'renovated', key: 'renovation_renovated' },
            { value: 'to_renovate', key: 'renovation_to_renovate' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  renovationStatus: value.renovationStatus.includes(item.value)
                    ? value.renovationStatus.filter((s) => s !== item.value)
                    : [...value.renovationStatus, item.value],
                })
              }
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                value.renovationStatus.includes(item.value)
                  ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
      </FilterDropdown>
          </div>
        </FilterDropdownLayoutContext.Provider>
      </ExtendedSearchModal>
      {!mapSidebar && (
        <LocationPickerModal
          open={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          value={value}
          onChange={onChange}
        />
      )}
      </div>
    </div>
    </FilterDropdownLayoutContext.Provider>
    </HeroSearchStyleContext.Provider>
  );
}
