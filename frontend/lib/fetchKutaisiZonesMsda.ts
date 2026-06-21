import {
  kutaisiRaioniMeta,
  type KutaisiZonesFeatureCollection,
} from '@/lib/kutaisiZonesGeoJson';

const WFS_URL = 'https://geoserver1.ms.gov.ge/geoserver/ms_maps_main/wfs';
const LAYER = 'ms_maps_main:msm_z__gis_data_00175';

function isKutaisiCity(city: unknown): boolean {
  return String(city ?? '')
    .trim()
    .toLowerCase()
    .replace(/^q/, 'k') === 'kutaisi';
}

let cached: Promise<KutaisiZonesFeatureCollection> | null = null;

export function fetchKutaisiZonesFromMsda(): Promise<KutaisiZonesFeatureCollection> {
  if (!cached) cached = loadKutaisiZonesFromMsda();
  return cached;
}

export function clearKutaisiZonesCache(): void {
  cached = null;
}

async function loadKutaisiZonesFromMsda(): Promise<KutaisiZonesFeatureCollection> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '1.1.0',
    REQUEST: 'GetFeature',
    TYPENAME: LAYER,
    OUTPUTFORMAT: 'application/json',
    MAXFEATURES: '100',
  });

  const res = await fetch(`${WFS_URL}?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`MSDA WFS error: ${res.status}`);
  }

  const data = (await res.json()) as GeoJSON.FeatureCollection;
  const kutaisiFeatures = (data.features ?? []).filter((f) =>
    isKutaisiCity(f.properties?.city)
  );

  if (!kutaisiFeatures.length) {
    throw new Error('MSDA WFS: Kutaisi zones not found');
  }

  const features = kutaisiFeatures.map((feature, index) => {
    const raioni = String(feature.properties?.raioni ?? feature.properties?.type ?? `zone_${index}`);
    const meta = kutaisiRaioniMeta(raioni, index);
    return {
      type: 'Feature' as const,
      geometry: feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      properties: {
        name: meta.name,
        zoneKey: meta.zoneKey,
        color: meta.color,
        raioni,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
