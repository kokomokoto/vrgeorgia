const DISTRICT_ZONES_CITIES = new Set(['თბილისი', 'ქუთაისი']);

export function cityHasDistrictZones(city: string | null | undefined): boolean {
  if (!city) return false;
  return DISTRICT_ZONES_CITIES.has(city.trim());
}
