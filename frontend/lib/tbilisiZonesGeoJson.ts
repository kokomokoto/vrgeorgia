import { TBILISI_OFFICIAL_UBANI } from '@/lib/tbilisiOfficialDistricts';
export type TbilisiZoneLayer = 'raioni' | 'ubani';

export type TbilisiZoneProperties = {
  name: string;
  zoneKey: string;
  color: string;
  layer: TbilisiZoneLayer;
  saxeli?: string;
  nn?: string;
};

export type TbilisiZoneFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  TbilisiZoneProperties
>;

export type TbilisiZonesFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  TbilisiZoneProperties
>;

export type TbilisiZonesBundle = {
  raioni: TbilisiZonesFeatureCollection;
  ubani: TbilisiZonesFeatureCollection;
};

/** MSDA msm_z__gis_data_00073 — saxeli → ოფიციალური სახელი */
export const TBILISI_RAIONI_META: Record<
  string,
  { name: string; zoneKey: string; color: string }
> = {
  mtawminda: { name: '\u10DB\u10E2\u10D0\u10EC\u10DB\u10D8\u10DC\u10D3\u10D0', zoneKey: 'raion_mtatsminda', color: '#6366f1' },
  vake: { name: '\u10D5\u10D0\u10D9\u10D4', zoneKey: 'raion_vake', color: '#3b82f6' },
  saburtalo: { name: '\u10E1\u10D0\u10D1\u10E3\u10E0\u10E2\u10D0\u10DA\u10DD', zoneKey: 'raion_saburtalo', color: '#0ea5e9' },
  krwanisi: { name: '\u10E0\u10D9\u10D8\u10DC\u10D8\u10E1\u10D8', zoneKey: 'raion_krtsanisi', color: '#14b8a6' },
  isani: { name: '\u10D8\u10E1\u10D0\u10DC\u10D8', zoneKey: 'raion_isani', color: '#06b6d4' },
  samgori: { name: '\u10E1\u10D0\u10DB\u10D2\u10DD\u10E0\u10D8', zoneKey: 'raion_samgori', color: '#10b981' },
  curureti: { name: '\u10E9\u10E3\u10D2\u10E3\u10E0\u10D4\u10D7\u10D8', zoneKey: 'raion_chughureti', color: '#8b5cf6' },
  didube: { name: '\u10D3\u10D8\u10D3\u10E3\u10D1\u10D4', zoneKey: 'raion_didube', color: '#a855f7' },
  nazaladevi: { name: '\u10DC\u10D0\u10EB\u10D0\u10DA\u10D0\u10D3\u10D4\u10D5\u10D8', zoneKey: 'raion_nadzaladevi', color: '#f59e0b' },
  gldani: { name: '\u10D2\u10DA\u10D3\u10D0\u10DC\u10D8', zoneKey: 'raion_gldani', color: '#ef4444' },
};

const RAIONI_ALIASES: Record<string, string> = {
  chureti: 'curureti',
  chugureti: 'curureti',
  krtsanisi: 'krwanisi',
};

const UBANI_ALIASES: Record<string, string> = {
  'mtawminda sololaki': 'mtawminda, sololaki',
  'vake bagebi': 'vake, bagebi',
  'vaja-fsavelas kvartlebi': 'vaja-pshavelas kvartlebi',
  'vazha-pshavelas kvartlebi': 'vaja-pshavelas kvartlebi',
  'nucubizis mikroraionebi': 'nutsubidzis mikroraionebi',
  'ortawala': 'kala, ortachala',
  'kala ortawala': 'kala, ortachala',
  'kala, ortawala': 'kala, ortachala',
  'foniwala': 'ponichala',
  'fonichala': 'ponichala',
  'dighomi vashlijvari': 'dighomi, vashlijvari',
  'diromi vashlijvari': 'dighomi, vashlijvari',
  'diromi, vaslijvari': 'dighomi, vashlijvari',
  'dighomi, vaslijvari': 'dighomi, vashlijvari',
  'vedzisi, yazbegi, gotua, saburtalo': 'vedzisi, yazbegi, gotua, saburtalo',
  'vezisi, yazbegi, gotua, saburtalo': 'vedzisi, yazbegi, gotua, saburtalo',
  'kostava baxtrioni dolize xiliani': 'kostava, baxtrioni, dolize, xiliani',
  'kala ortachala': 'kala, ortachala',
  'zemo avlabari metromtseni': 'zemo avlabari, metromtseni',
  'zemo avlabari metromcheni': 'zemo avlabari, metromtseni',
  'zemo avlabari, metromseni': 'zemo avlabari, metromtseni',
  'vazisubani me-8 legioni': 'vazisubani, me-8 legioni',
  'orkhevi aeroporti': 'orkhevi, aeroporti',
  'orxevi aeroporti': 'orkhevi, aeroporti',
  'orxevi, aeroporti': 'orkhevi, aeroporti',
  'qvemo samgori': 'qvemo samgori',
  'zemo chureti': 'zemo chugureti',
  'zemo curureti': 'zemo chugureti',
  'zemo chugureti': 'zemo chugureti',
  'qveda chureti': 'qveda chugureti',
  'qveda curureti': 'qveda chugureti',
  'qveda chugureti': 'qveda chugureti',
  'dighmis masivi': 'dighmis masivi',
  'dirmis masivi': 'dighmis masivi',
  'zveli nadzaladevi lotkini': 'zveli nadzaladevi, lotkini',
  'zveli nazaladevi, lotkini': 'zveli nadzaladevi, lotkini',
  'avchala gldanis xevi': 'avchala, gldanis xevi',
  'avwala gldanis xevi': 'avchala, gldanis xevi',
  'avwala, gldanis xevi': 'avchala, gldanis xevi',
  'gldanis luwi mikroraionebi': 'gldanis qve mikroraionebi',
  'gldanis lower mikroraionebi': 'gldanis qve mikroraionebi',
  'wavkisi sindisi tabaxmela': 'wavkisi,sindisi, tabaxmela',
  'wavkisi, sindisi, tabaxmela': 'wavkisi,sindisi, tabaxmela',
  'kiketi kojori': 'kiketi, kojori',
  navtluri: 'navtlughi',
  muxiani: 'mukhiani',
  nazaladevi: 'nadzaladevi',
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

export function normalizeTbilisiSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[,]/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\bt\b/g, 't')
    .replace(/^q/, 'k');
}

function raioniLookupKey(saxeli: string): string {
  const raw = normalizeTbilisiSlug(saxeli).replace(/\s+/g, '');
  const aliased = RAIONI_ALIASES[raw] ?? raw;
  if (TBILISI_RAIONI_META[aliased]) return aliased;
  if (raw.includes('chureti') || raw.includes('chugureti') || raw.includes('curureti')) return 'curureti';
  if (raw.includes('nazaladevi')) return 'nazaladevi';
  if (raw.includes('saburtalo')) return 'saburtalo';
  return aliased;
}

function ubaniLookupKey(saxeli: string): string {
  const normalized = normalizeTbilisiSlug(saxeli);
  return UBANI_ALIASES[normalized] ?? normalized;
}

/** MSDA msm_z__gis_data_00171 — saxeli → ოფიციალური სახელი */
export const TBILISI_UBANI_META: Record<
  string,
  { name: string; zoneKey: string; color: string }
> = (() => {
  const meta: Record<string, { name: string; zoneKey: string; color: string }> = {};
  for (const ubani of TBILISI_OFFICIAL_UBANI) {
    const lookupKey = ubaniLookupKey(ubani.saxeli);
    meta[lookupKey] = { name: ubani.ka, zoneKey: ubani.key, color: ubani.color };
  }
  for (const [alias, target] of Object.entries(UBANI_ALIASES)) {
    if (meta[target]) meta[alias] = meta[target];
  }
  return meta;
})();

export function tbilisiRaioniMeta(saxeli: string, index = 0) {
  const key = raioniLookupKey(saxeli);
  const known = TBILISI_RAIONI_META[key];
  if (known) return known;
  const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const slug = key.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `zone_${index}`;
  return {
    name: saxeli.trim(),
    zoneKey: `raion_msda_${slug}`,
    color,
  };
}

export function tbilisiUbaniMeta(saxeli: string, index = 0) {
  const key = ubaniLookupKey(saxeli);
  const known = TBILISI_UBANI_META[key];
  if (known) return known;
  const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const slug = key.replace(/[^a-z0-9,]+/g, '_').replace(/^_|_$/g, '') || `zone_${index}`;
  return {
    name: saxeli.trim(),
    zoneKey: `sub_msda_${slug}`,
    color,
  };
}

export const TBILISI_MAP_CENTER = { lat: 41.7151, lng: 44.8271 };
export const TBILISI_MAP_ZOOM = 11;
