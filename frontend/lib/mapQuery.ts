import type { FiltersState } from '@/components/Filters';
import type { PropertyQuery } from '@/lib/api';
import { apiLang } from '@/lib/apiLang';

const ARRAY_KEYS = new Set([
  'tbilisiSubdistricts',
  'type',
  'dealType',
  'amenities',
  'buildingProject',
  'renovationStatus',
  'buildingStatus',
  'landStatus',
  'balconies',
  'rooms',
  'bedrooms'
]);

export const DEFAULT_MAP_FILTERS: FiltersState = {
  q: '',
  minPrice: '',
  maxPrice: '',
  priceCurrency: '',
  priceType: 'total',
  city: '',
  region: '',
  tbilisiDistrict: '',
  tbilisiSubdistricts: [],
  type: [],
  dealType: [],
  has3d: '',
  hasPhotos: '',
  minSqm: '',
  maxSqm: '',
  minConstructionYear: '',
  maxConstructionYear: '',
  minRenovationYear: '',
  maxRenovationYear: '',
  rooms: [],
  bedrooms: [],
  balconies: [],
  amenities: [],
  buildingProject: [],
  renovationStatus: [],
  buildingStatus: [],
  landStatus: [],
  propertyId: ''
};

export function filtersAreActive(filters: FiltersState): boolean {
  return JSON.stringify(filters) !== JSON.stringify(DEFAULT_MAP_FILTERS);
}

function parseJsonStringArray(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function filtersToPropertyQuery(
  filters: FiltersState,
  sort: string,
  lang?: string
): PropertyQuery {
  const q: PropertyQuery = {
    q: filters.q || undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    priceCurrency: filters.priceCurrency || undefined,
    priceType:
      filters.minPrice || filters.maxPrice
        ? filters.priceType === 'per_sqm'
          ? 'per_sqm'
          : 'total'
        : filters.priceType === 'per_sqm'
          ? 'per_sqm'
          : filters.priceType === 'total'
            ? 'total'
            : undefined,
    city: filters.city || undefined,
    region: filters.region || undefined,
    tbilisiDistrict: filters.tbilisiDistrict || undefined,
    tbilisiSubdistricts: filters.tbilisiSubdistricts.length ? filters.tbilisiSubdistricts : undefined,
    type: filters.type.length ? filters.type : undefined,
    dealType: filters.dealType.length ? filters.dealType : undefined,
    has3d: filters.has3d || undefined,
    hasPhotos: filters.hasPhotos || undefined,
    minSqm: filters.minSqm || undefined,
    maxSqm: filters.maxSqm || undefined,
    minConstructionYear: filters.minConstructionYear || undefined,
    maxConstructionYear: filters.maxConstructionYear || undefined,
    minRenovationYear: filters.minRenovationYear || undefined,
    maxRenovationYear: filters.maxRenovationYear || undefined,
    rooms: filters.rooms.length ? filters.rooms : undefined,
    bedrooms: filters.bedrooms.length ? filters.bedrooms : undefined,
    balconies: filters.balconies.length ? filters.balconies : undefined,
    amenities: filters.amenities.length ? filters.amenities : undefined,
    buildingProject: filters.buildingProject.length ? filters.buildingProject : undefined,
    renovationStatus: filters.renovationStatus.length ? filters.renovationStatus : undefined,
    buildingStatus: filters.buildingStatus.length ? filters.buildingStatus : undefined,
    landStatus: filters.landStatus.length ? filters.landStatus : undefined,
    propertyId: filters.propertyId || undefined,
    sort: sort || undefined,
    lang: lang ? apiLang(lang) : undefined
  };
  return q;
}

/** იგივე წესი, რაც `listProperties` API-ში */
export function propertyQueryToSearchString(query: PropertyQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (ARRAY_KEYS.has(k) && Array.isArray(v)) {
      params.set(k, JSON.stringify(v));
    } else {
      params.set(k, String(v));
    }
  }
  return params.toString();
}

export function searchParamsToFiltersState(sp: URLSearchParams): { filters: FiltersState; sort: string } {
  const filters: FiltersState = { ...DEFAULT_MAP_FILTERS };
  filters.q = sp.get('q') || '';
  filters.minPrice = sp.get('minPrice') || '';
  filters.maxPrice = sp.get('maxPrice') || '';
  filters.priceCurrency = sp.get('priceCurrency') || '';
  filters.priceType = sp.get('priceType') || 'total';
  filters.city = sp.get('city') || '';
  filters.region = sp.get('region') || '';
  filters.tbilisiDistrict = sp.get('tbilisiDistrict') || '';
  filters.tbilisiSubdistricts = parseJsonStringArray(sp.get('tbilisiSubdistricts'));
  filters.type = parseJsonStringArray(sp.get('type'));
  filters.dealType = parseJsonStringArray(sp.get('dealType'));
  filters.has3d = sp.get('has3d') || '';
  filters.hasPhotos = sp.get('hasPhotos') || '';
  filters.minSqm = sp.get('minSqm') || '';
  filters.maxSqm = sp.get('maxSqm') || '';
  filters.minConstructionYear = sp.get('minConstructionYear') || '';
  filters.maxConstructionYear = sp.get('maxConstructionYear') || '';
  filters.minRenovationYear = sp.get('minRenovationYear') || '';
  filters.maxRenovationYear = sp.get('maxRenovationYear') || '';
  filters.rooms = parseJsonStringArray(sp.get('rooms'));
  filters.bedrooms = parseJsonStringArray(sp.get('bedrooms'));
  filters.balconies = parseJsonStringArray(sp.get('balconies'));
  filters.amenities = parseJsonStringArray(sp.get('amenities'));
  filters.buildingProject = parseJsonStringArray(sp.get('buildingProject'));
  filters.renovationStatus = parseJsonStringArray(sp.get('renovationStatus'));
  filters.buildingStatus = parseJsonStringArray(sp.get('buildingStatus'));
  filters.landStatus = parseJsonStringArray(sp.get('landStatus'));
  filters.propertyId = sp.get('propertyId') || '';
  const sort = sp.get('sort') || 'date_desc';
  return { filters, sort };
}

/** სლაიდერის/ჰისტოგრამის წყარო — ფასი/ფართობის გარეშე (facet-ის ლოგიკა) */
export function omitPriceAreaFilters(filters: FiltersState): FiltersState {
  return {
    ...filters,
    minPrice: '',
    maxPrice: '',
    minSqm: '',
    maxSqm: '',
  };
}

/**
 * Shareable query string. Omits language (that lives in /en /ru) and defaults
 * (`sort=date_desc`, `priceType=total` with no price) so an unfiltered page stays `/`.
 */
export function listingFiltersToSearchString(filters: FiltersState, sort: string, page = 1): string {
  const q: PropertyQuery = { ...filtersToPropertyQuery(filters, sort) };
  delete q.lang;
  if (!filters.minPrice && !filters.maxPrice) delete q.priceType;
  if (!sort || sort === 'date_desc') delete q.sort;
  const params = new URLSearchParams(propertyQueryToSearchString(q));
  if (page > 1) params.set('page', String(page));
  return params.toString();
}

export function readListingSearch(sp: URLSearchParams): { filters: FiltersState; sort: string; page: number } {
  const { filters, sort } = searchParamsToFiltersState(sp);
  const n = Number(sp.get('page'));
  const page = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return { filters, sort, page };
}

export function buildFilteredHref(pathname: string, filters: FiltersState, sort: string, page = 1): string {
  const qs = listingFiltersToSearchString(filters, sort, page);
  return qs ? `${pathname}?${qs}` : pathname;
}

/** True when the address bar already shows this href (encoding differences ignored). */
export function browserHrefMatches(href: string): boolean {
  if (typeof window === 'undefined') return false;
  const current = new URL(window.location.pathname + window.location.search, 'http://local');
  const next = new URL(href, 'http://local');
  if (current.pathname !== next.pathname) return false;
  const a = current.searchParams;
  const b = next.searchParams;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    if (a.get(key) !== b.get(key)) return false;
  }
  return true;
}

/** `lang` არ უნდა იყოს URL-ში — ენა ბილიკშია (`/en`, `/ru`). */
export function buildMapHref(filters: FiltersState, sort: string, _lang?: string): string {
  return buildFilteredHref('/map', filters, sort);
}
