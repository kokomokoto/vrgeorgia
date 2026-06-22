import type { FiltersState } from '@/components/Filters';
import { DEFAULT_MAP_FILTERS } from '@/lib/mapQuery';

const STORAGE_KEY = 'vr-home-filters-v1';

/** ძველი sessionStorage ჩანაწერის წაშლა (refresh-ზე სუფთა ფილტრები) */
export function clearHomeFiltersStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_MAP_FILTERS as HOME_FILTERS_INITIAL };
