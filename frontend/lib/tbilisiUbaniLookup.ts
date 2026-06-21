import {
  TBILISI_DISTRICTS,
  TBILISI_ZONE_KEY_MAP,
  normalizeTbilisiSubdistrictKa,
} from '@/lib/tbilisiOfficialDistricts';
import { fetchTbilisiZonesFromMsda } from '@/lib/fetchTbilisiZonesMsda';
import type { TbilisiZoneFeature } from '@/lib/tbilisiZonesGeoJson';

export type TbilisiUbaniMatch = {
  districtKey: string;
  ka: string;
  zoneKey: string;
  zoneName: string;
};

function normalizeGeoText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lng: number, lat: number, coords: number[][][]): boolean {
  if (!coords.length) return false;
  if (!pointInRing(lng, lat, coords[0])) return false;
  for (let h = 1; h < coords.length; h++) {
    if (pointInRing(lng, lat, coords[h])) return false;
  }
  return true;
}

function geometryArea(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let total = 0;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring?.length) continue;
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    total += Math.abs(area / 2);
  }
  return total;
}

function pointInGeometry(
  lng: number,
  lat: number,
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  if (geometry.type === 'Polygon') {
    return pointInPolygonCoords(lng, lat, geometry.coordinates);
  }
  return geometry.coordinates.some((poly) => pointInPolygonCoords(lng, lat, poly));
}

function resolveFromZoneKey(zoneKey: string, zoneName: string): TbilisiUbaniMatch | null {
  const direct = TBILISI_ZONE_KEY_MAP[zoneKey];
  if (direct) {
    return { ...direct, districtKey: direct.districtKey, zoneKey, zoneName };
  }

  const parts = zoneName.split(/[,/]/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const partNorm = normalizeGeoText(part);
    if (partNorm.length < 3) continue;
    for (const [districtKey, district] of Object.entries(TBILISI_DISTRICTS)) {
      for (const sub of district.subdistricts) {
        const kaNorm = normalizeGeoText(sub.ka);
        if (kaNorm === partNorm || kaNorm.includes(partNorm) || partNorm.includes(kaNorm)) {
          return { districtKey, ka: sub.ka, zoneKey, zoneName };
        }
      }
    }
  }

  return null;
}

export async function lookupTbilisiUbaniAtPoint(
  lat: number,
  lng: number
): Promise<TbilisiUbaniMatch | null> {
  const bundle = await fetchTbilisiZonesFromMsda();
  const matches: TbilisiZoneFeature[] = [];

  for (const feature of bundle.ubani.features) {
    if (!feature.geometry) continue;
    if (pointInGeometry(lng, lat, feature.geometry)) {
      matches.push(feature);
    }
  }

  if (!matches.length) return null;

  matches.sort((a, b) => geometryArea(a.geometry!) - geometryArea(b.geometry!));

  for (const feature of matches) {
    const zoneKey = feature.properties?.zoneKey ?? '';
    const zoneName = feature.properties?.name ?? '';
    const resolved = resolveFromZoneKey(zoneKey, zoneName);
    if (resolved) return resolved;
  }

  return null;
}

export { normalizeTbilisiSubdistrictKa };
