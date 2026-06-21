import {
  tbilisiRaioniMeta,
  tbilisiUbaniMeta,
  type TbilisiZonesBundle,
  type TbilisiZonesFeatureCollection,
} from '@/lib/tbilisiZonesGeoJson';

const WFS_URL = 'https://geoserver1.ms.gov.ge/geoserver/ms_maps_main/wfs';
const RAIONI_LAYER = 'ms_maps_main:msm_z__gis_data_00073';
const UBANI_LAYER = 'ms_maps_main:msm_z__gis_data_00171';

let cached: Promise<TbilisiZonesBundle> | null = null;

export function fetchTbilisiZonesFromMsda(): Promise<TbilisiZonesBundle> {
  if (!cached) cached = loadTbilisiZonesFromMsda();
  return cached;
}

export function clearTbilisiZonesCache(): void {
  cached = null;
}

async function fetchWfsLayer(layer: string, maxFeatures = '200'): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '1.1.0',
    REQUEST: 'GetFeature',
    TYPENAME: layer,
    OUTPUTFORMAT: 'application/json',
    MAXFEATURES: maxFeatures,
  });

  const res = await fetch(`${WFS_URL}?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`MSDA WFS error (${layer}): ${res.status}`);
  }

  return (await res.json()) as GeoJSON.FeatureCollection;
}

function mapRaioniFeatures(features: GeoJSON.Feature[]): TbilisiZonesFeatureCollection {
  const mapped = features.map((feature, index) => {
    const saxeli = String(feature.properties?.saxeli ?? `raion_${index}`);
    const meta = tbilisiRaioniMeta(saxeli, index);
    return {
      type: 'Feature' as const,
      geometry: feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      properties: {
        name: meta.name,
        zoneKey: meta.zoneKey,
        color: meta.color,
        layer: 'raioni' as const,
        saxeli,
      },
    };
  });

  return { type: 'FeatureCollection', features: mapped };
}

function mapUbaniFeatures(features: GeoJSON.Feature[]): TbilisiZonesFeatureCollection {
  const mapped = features.map((feature, index) => {
    const saxeli = String(feature.properties?.saxeli ?? `ubani_${index}`);
    const nn = feature.properties?.nn != null ? String(feature.properties.nn) : undefined;
    const meta = tbilisiUbaniMeta(saxeli, index);
    return {
      type: 'Feature' as const,
      geometry: feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      properties: {
        name: meta.name,
        zoneKey: meta.zoneKey,
        color: meta.color,
        layer: 'ubani' as const,
        saxeli,
        nn,
      },
    };
  });

  return { type: 'FeatureCollection', features: mapped };
}

async function loadTbilisiZonesFromMsda(): Promise<TbilisiZonesBundle> {
  const [raioniRaw, ubaniRaw] = await Promise.all([
    fetchWfsLayer(RAIONI_LAYER, '20'),
    fetchWfsLayer(UBANI_LAYER, '50'),
  ]);

  const raioniFeatures = raioniRaw.features ?? [];
  const ubaniFeatures = ubaniRaw.features ?? [];

  if (!raioniFeatures.length) {
    throw new Error('MSDA WFS: Tbilisi raioni not found');
  }
  if (!ubaniFeatures.length) {
    throw new Error('MSDA WFS: Tbilisi ubani not found');
  }

  return {
    raioni: mapRaioniFeatures(raioniFeatures),
    ubani: mapUbaniFeatures(ubaniFeatures),
  };
}
