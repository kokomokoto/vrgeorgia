import type { FiltersState } from '@/components/Filters';
import { API_BASE } from '@/lib/config';

const SESSION_KEY = 'vrgeorgia_session';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function hasActiveSearchFilters(filters: FiltersState): boolean {
  return !!(
    filters.q.trim() ||
    filters.dealType.length ||
    filters.type.length ||
    filters.city ||
    filters.region ||
    filters.tbilisiDistrict ||
    filters.tbilisiSubdistricts.length ||
    filters.has3d ||
    filters.hasPhotos ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minSqm ||
    filters.maxSqm ||
    filters.minConstructionYear ||
    filters.maxConstructionYear ||
    filters.minRenovationYear ||
    filters.maxRenovationYear ||
    filters.rooms.length ||
    filters.bedrooms.length ||
    filters.balconies.length ||
    filters.amenities.length ||
    filters.buildingProject.length ||
    filters.renovationStatus.length ||
    filters.buildingStatus.length ||
    filters.landStatus.length ||
    filters.propertyId.trim()
  );
}

export function filtersToSearchPayload(
  filters: FiltersState,
  opts: { source: string; agentId?: string; sort?: string; resultCount?: number }
) {
  return {
    source: opts.source,
    agentId: opts.agentId || '',
    sessionId: getSessionId(),
    sort: opts.sort || '',
    resultCount: opts.resultCount ?? null,
    q: filters.q.trim(),
    dealTypes: filters.dealType,
    types: filters.type,
    city: filters.city,
    region: filters.region,
    tbilisiDistrict: filters.tbilisiDistrict,
    tbilisiSubdistricts: filters.tbilisiSubdistricts,
    has3d: filters.has3d === 'true',
    hasPhotos: filters.hasPhotos === 'true',
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    priceCurrency: filters.priceCurrency,
    priceType: filters.priceType,
    minSqm: filters.minSqm,
    maxSqm: filters.maxSqm,
    rooms: filters.rooms,
    bedrooms: filters.bedrooms,
    balconies: filters.balconies,
    amenities: filters.amenities,
    buildingProject: filters.buildingProject,
    renovationStatus: filters.renovationStatus,
    buildingStatus: filters.buildingStatus,
    landStatus: filters.landStatus,
    minConstructionYear: filters.minConstructionYear,
    maxConstructionYear: filters.maxConstructionYear,
    minRenovationYear: filters.minRenovationYear,
    maxRenovationYear: filters.maxRenovationYear,
    propertyId: filters.propertyId.trim(),
  };
}

const lastSent = new Map<string, string>();

/** სერჩის/ფილტრის გამოყენების აღრიცხვა (იგივე ფილტრის დუბლიკატი არ იგზავნება) */
export type SearchAnalyticsSource =
  | 'home'
  | 'map'
  | 'agent'
  | 'profile'
  | 'admin_tours'
  | 'admin_properties'
  | 'admin_agent_detail';

export function trackSearchFilters(
  source: SearchAnalyticsSource,
  filters: FiltersState,
  opts?: { agentId?: string; sort?: string; resultCount?: number }
) {
  if (typeof window === 'undefined') return;
  if (!hasActiveSearchFilters(filters)) return;

  const payload = filtersToSearchPayload(filters, { source, ...opts });
  const fingerprint = JSON.stringify(payload);
  const key = `${source}:${opts?.agentId || ''}`;
  if (lastSent.get(key) === fingerprint) return;
  lastSent.set(key, fingerprint);

  fetch(`${API_BASE}/api/analytics/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
