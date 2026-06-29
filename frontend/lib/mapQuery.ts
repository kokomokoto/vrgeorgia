import type { FiltersState } from '@/components/Filters';
import type { PropertyQuery } from '@/lib/api';

const ARRAY_KEYS = new Set([
  'tbilisiSubdistricts',
  'type',
  'dealType',
  'amenities',
  'buildingProject',
  'renovationStatus',
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
    propertyId: filters.propertyId || undefined,
    sort: sort || undefined,
    lang: lang || undefined
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

/** `lang` არ უნდა იყოს URL-ში მთავარი გვერდის ბმულზე — SSR vs კლიენტი სხვადასხვა `i18n.language`-ს იძლევა და hydration error-ს იწვევს. `/map` გვერდი ისევ იყენებს `useTranslation().language` API-ზე. */
export function buildMapHref(filters: FiltersState, sort: string, lang?: string): string {
  const qs = propertyQueryToSearchString(filtersToPropertyQuery(filters, sort, lang));
  return qs ? `/map?${qs}` : '/map';
}
