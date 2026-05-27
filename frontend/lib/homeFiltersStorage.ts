import type { FiltersState } from '@/components/Filters';
import { DEFAULT_MAP_FILTERS } from '@/lib/mapQuery';

const STORAGE_KEY = 'vr-home-filters-v1';

function normalizeFilters(raw: Partial<FiltersState>): FiltersState {
  return {
    ...DEFAULT_MAP_FILTERS,
    ...raw,
    tbilisiSubdistricts: Array.isArray(raw.tbilisiSubdistricts) ? raw.tbilisiSubdistricts : [],
    type: Array.isArray(raw.type) ? raw.type : [],
    dealType: Array.isArray(raw.dealType) ? raw.dealType : [],
    rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
    bedrooms: Array.isArray(raw.bedrooms) ? raw.bedrooms : [],
    balconies: Array.isArray(raw.balconies) ? raw.balconies : [],
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    buildingProject: Array.isArray(raw.buildingProject) ? raw.buildingProject : [],
    renovationStatus: Array.isArray(raw.renovationStatus) ? raw.renovationStatus : [],
  };
}

export function loadHomeFilters(): FiltersState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeFilters(JSON.parse(raw) as Partial<FiltersState>);
  } catch {
    return null;
  }
}

export function saveHomeFilters(filters: FiltersState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* ignore quota */
  }
}

export function clearHomeFiltersStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_MAP_FILTERS as HOME_FILTERS_INITIAL };
