import type { FiltersState } from '@/components/Filters';
import { DEFAULT_MAP_FILTERS } from '@/lib/mapQuery';

const STORAGE_KEY = 'vr-home-filters-v1';
/** SPA-დან (ობიექტზე) გასვლის ნიშანი — უკან დაბრუნებისას აღდგენა */
const RESTORE_FLAG_KEY = 'vr-home-filters-restore-v1';
/** beforeunload — რეფრეში/ტაბის დახურვა, არა SPA ნავიგაცია */
const UNLOADING_KEY = 'vr-home-filters-unloading-v1';

export type HomeSearchSnapshot = {
  filters: FiltersState;
  sort: string;
  page: number;
};

function normalizeFilters(raw: Partial<FiltersState> | null | undefined): FiltersState {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    ...DEFAULT_MAP_FILTERS,
    ...src,
    tbilisiSubdistricts: Array.isArray(src.tbilisiSubdistricts) ? src.tbilisiSubdistricts.map(String) : [],
    type: Array.isArray(src.type) ? src.type.map(String) : [],
    dealType: Array.isArray(src.dealType) ? src.dealType.map(String) : [],
    rooms: Array.isArray(src.rooms) ? src.rooms.map(String) : [],
    bedrooms: Array.isArray(src.bedrooms) ? src.bedrooms.map(String) : [],
    balconies: Array.isArray(src.balconies) ? src.balconies.map(String) : [],
    amenities: Array.isArray(src.amenities) ? src.amenities.map(String) : [],
    buildingProject: Array.isArray(src.buildingProject) ? src.buildingProject.map(String) : [],
    renovationStatus: Array.isArray(src.renovationStatus) ? src.renovationStatus.map(String) : [],
    buildingStatus: Array.isArray(src.buildingStatus) ? src.buildingStatus.map(String) : [],
    landStatus: Array.isArray(src.landStatus) ? src.landStatus.map(String) : [],
  };
}

function parseStored(raw: string): HomeSearchSnapshot | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return null;

    if ('filters' in data && data.filters && typeof data.filters === 'object') {
      const snap = data as Partial<HomeSearchSnapshot>;
      const page = Number(snap.page);
      return {
        filters: normalizeFilters(snap.filters as Partial<FiltersState>),
        sort: typeof snap.sort === 'string' && snap.sort ? snap.sort : 'date_desc',
        page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
      };
    }

    return {
      filters: normalizeFilters(data as Partial<FiltersState>),
      sort: 'date_desc',
      page: 1,
    };
  } catch {
    return null;
  }
}

export function loadHomeSearchSnapshot(): HomeSearchSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseStored(raw);
  } catch {
    return null;
  }
}

/** @deprecated გამოიყენე loadHomeSearchSnapshot */
export function loadHomeFilters(): FiltersState | null {
  return loadHomeSearchSnapshot()?.filters ?? null;
}

export function saveHomeSearchSnapshot(snapshot: HomeSearchSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        filters: snapshot.filters,
        sort: snapshot.sort || 'date_desc',
        page: Math.max(1, Math.floor(snapshot.page) || 1),
      })
    );
  } catch {
    /* ignore quota */
  }
}

/** @deprecated გამოიყენე saveHomeSearchSnapshot */
export function saveHomeFilters(filters: FiltersState): void {
  const prev = loadHomeSearchSnapshot();
  saveHomeSearchSnapshot({
    filters,
    sort: prev?.sort || 'date_desc',
    page: prev?.page || 1,
  });
}

export function clearHomeFiltersStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(RESTORE_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

/** მთავარი გვერდიდან SPA-ით გასვლა (ობიექტი და სხვა) — უკან დაბრუნებისას აღდგეს */
export function markHomeFiltersForRestore(): void {
  if (typeof window === 'undefined') return;
  try {
    // რეფრეში/unload — არ მონიშნო აღდგენა
    if (sessionStorage.getItem(UNLOADING_KEY) === '1') return;
    sessionStorage.setItem(RESTORE_FLAG_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * მთავარი გვერდის hydrate:
 * - restore flag (ობიექტიდან უკან) → შენახული ფილტრები
 * - სხვა შემთხვევა (რეფრეში, პირდაპირი შესვლა, Vhome) → სუფთა
 */
export function consumeHomeSearchOnMount(): HomeSearchSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    sessionStorage.removeItem(UNLOADING_KEY);
    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG_KEY) === '1';
    sessionStorage.removeItem(RESTORE_FLAG_KEY);

    if (shouldRestore) {
      return loadHomeSearchSnapshot();
    }

    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

/** beforeunload: რეფრეშზე home cleanup-მა restore flag არ დააყენოს */
export function markHomeFiltersDocumentUnloading(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(UNLOADING_KEY, '1');
    sessionStorage.removeItem(RESTORE_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

export { DEFAULT_MAP_FILTERS as HOME_FILTERS_INITIAL };
