import type { Property } from '@/lib/types';

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function isPropertyInMapBounds(
  p: Property,
  bounds: MapBounds
): boolean {
  const lat = p.location?.lat;
  const lng = p.location?.lng;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/** განცხადებები, რომლებიც მიმდინარე რუკის ჩარჩოში ჩანს */
export function filterPropertiesByMapBounds(
  properties: Property[],
  bounds: MapBounds | null
): Property[] {
  if (!bounds) return properties;
  return properties.filter((p) => isPropertyInMapBounds(p, bounds));
}

export function mapBoundsEqual(
  a: MapBounds | null,
  b: MapBounds | null,
  epsilon = 1e-5
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.north - b.north) < epsilon &&
    Math.abs(a.south - b.south) < epsilon &&
    Math.abs(a.east - b.east) < epsilon &&
    Math.abs(a.west - b.west) < epsilon
  );
}
