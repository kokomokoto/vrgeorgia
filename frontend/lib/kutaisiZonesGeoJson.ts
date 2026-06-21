/**
 * ქუთაისის უბნების ტიპები და სტილები.
 * გეომეტრია იტვირთება MSDA GeoServer WFS-იდან (fetchKutaisiZonesMsda.ts).
 */
export type KutaisiZoneProperties = {
  name: string;
  zoneKey: string;
  color: string;
  raioni?: string;
};

export type KutaisiZoneFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  KutaisiZoneProperties
>;

export type KutaisiZonesFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  KutaisiZoneProperties
>;

/** MSDA msm_z__gis_data_00175 — raioni → ოფიციალური ქართ. სახელი (ms.gov.ge) */
export const KUTAISI_RAIONI_META: Record<
  string,
  { name: string; zoneKey: string; color: string }
> = {
  gumati: { name: '\u10D2\u10E3\u10DB\u10D0\u10D7\u10D8', zoneKey: 'sub_gumati', color: '#84cc16' },
  uqimerioni: { name: '\u10E3\u10E5\u10D8\u10DB\u10D4\u10E0\u10D8\u10DD\u10DC\u10D8', zoneKey: 'sub_uqimerioni', color: '#06b6d4' },
  saficxia: { name: '\u10E1\u10D0\u10E4\u10D8\u10E9\u10EE\u10D8\u10D0', zoneKey: 'sub_sapichkhia', color: '#8b5cf6' },
  kaxianouri: { name: '\u10D9\u10D0\u10EE\u10D8\u10D0\u10DC\u10DD\u10E3\u10E0\u10D8', zoneKey: 'sub_kakhianouri', color: '#7c3aed' },
  muxnari: { name: '\u10DB\u10E3\u10EE\u10DC\u10D0\u10E0\u10D8', zoneKey: 'sub_mukhnari', color: '#22c55e' },
  nikea: { name: '\u10DC\u10D8\u10D9\u10D4\u10D0', zoneKey: 'sub_nikea', color: '#3b82f6' },
  vakisubani: { name: '\u10D5\u10D0\u10D9\u10D8\u10E1\u10E3\u10D1\u10D0\u10DC\u10D8', zoneKey: 'sub_vakichubani', color: '#0ea5e9' },
  'sulxan-saba': { name: '\u10E1\u10E3\u10DA\u10EE\u10D0\u10DC-\u10E1\u10D0\u10D1\u10D0', zoneKey: 'sub_sulkhan_saba', color: '#059669' },
  avtoqarxana: { name: '\u10D0\u10D5\u10E2\u10DD\u10E5\u10D0\u10E0\u10EE\u10D0\u10DC\u10D0', zoneKey: 'sub_avtoqarkhana', color: '#10b981' },
  gamarjveba: { name: '\u10D2\u10D0\u10DB\u10D0\u10E0\u10DF\u10D5\u10D4\u10D1\u10D0', zoneKey: 'sub_gamarjveba', color: '#2563eb' },
  zelqviani: { name: '\u10EB\u10D4\u10DA\u10E5\u10D5\u10D8\u10D0\u10DC\u10D8', zoneKey: 'sub_dzelkviani', color: '#6366f1' },
  'qalaqi muzeumi': { name: '\u10E5\u10D0\u10DA\u10D0\u10E5\u10D8 \u10DB\u10E3\u10D6\u10D4\u10E3\u10DB\u10D8', zoneKey: 'sub_qalaqi_muzeumi', color: '#1d4ed8' },
};

const FALLBACK_COLORS = [
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#0ea5e9',
  '#06b6d4',
  '#14b8a6',
  '#2563eb',
  '#1d4ed8',
  '#7c3aed',
  '#059669',
  '#10b981',
  '#22c55e',
];

export function normalizeKutaisiRaioni(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function kutaisiRaioniMeta(raioni: string, index = 0) {
  const key = normalizeKutaisiRaioni(raioni);
  const known = KUTAISI_RAIONI_META[key];
  if (known) return known;
  const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const slug = key.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `zone_${index}`;
  return {
    name: raioni.trim(),
    zoneKey: `sub_msda_${slug}`,
    color,
  };
}

export const KUTAISI_MAP_CENTER = { lat: 42.267, lng: 42.698 };
export const KUTAISI_MAP_ZOOM = 13;

/** ოფიციალური უბნების სია (MSDA) — ფილტრი/არჩევა */
export const KUTAISI_OFFICIAL_DISTRICTS: { key: string; ka: string }[] = [
  { key: 'sub_gumati', ka: '\u10D2\u10E3\u10DB\u10D0\u10D7\u10D8' },
  { key: 'sub_uqimerioni', ka: '\u10E3\u10E5\u10D8\u10DB\u10D4\u10E0\u10D8\u10DD\u10DC\u10D8' },
  { key: 'sub_sapichkhia', ka: '\u10E1\u10D0\u10E4\u10D8\u10E9\u10EE\u10D8\u10D0' },
  { key: 'sub_kakhianouri', ka: '\u10D9\u10D0\u10EE\u10D8\u10D0\u10DC\u10DD\u10E3\u10E0\u10D8' },
  { key: 'sub_mukhnari', ka: '\u10DB\u10E3\u10EE\u10DC\u10D0\u10E0\u10D8' },
  { key: 'sub_nikea', ka: '\u10DC\u10D8\u10D9\u10D4\u10D0' },
  { key: 'sub_vakichubani', ka: '\u10D5\u10D0\u10D9\u10D8\u10E1\u10E3\u10D1\u10D0\u10DC\u10D8' },
  { key: 'sub_sulkhan_saba', ka: '\u10E1\u10E3\u10DA\u10EE\u10D0\u10DC-\u10E1\u10D0\u10D1\u10D0' },
  { key: 'sub_avtoqarkhana', ka: '\u10D0\u10D5\u10E2\u10DD\u10E5\u10D0\u10E0\u10EE\u10D0\u10DC\u10D0' },
  { key: 'sub_gamarjveba', ka: '\u10D2\u10D0\u10DB\u10D0\u10E0\u10DF\u10D5\u10D4\u10D1\u10D0' },
  { key: 'sub_dzelkviani', ka: '\u10EB\u10D4\u10DA\u10E5\u10D5\u10D8\u10D0\u10DC\u10D8' },
  { key: 'sub_qalaqi_muzeumi', ka: '\u10E5\u10D0\u10DA\u10D0\u10E5\u10D8 \u10DB\u10E3\u10D6\u10D4\u10E3\u10DB\u10D8' },
];
