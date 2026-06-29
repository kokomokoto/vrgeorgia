/**
 * Fetches Kutaisi admin_level=10 boundaries from OSM Overpass and writes GeoJSON.
 * Run: node scripts/fetch-kutaisi-zones.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const query = `
[out:json][timeout:90];
(
  relation["boundary"="administrative"]["admin_level"="10"](42.20,42.65,42.32,42.78);
);
out tags geom;
`;

const res = await fetch('https://overpass.kumi.systems/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'VRGeorgia/1.0 (dev; contact: vrgeorgia.local)',
  },
  body: `data=${encodeURIComponent(query)}`,
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error('Overpass error:', text.slice(0, 500));
  process.exit(1);
}
if (!data.elements?.length) {
  console.error('No elements returned', data);
  process.exit(1);
}

/** Map OSM name:ka to our filter zone ka label */
const NAME_MAP = {
  'გუმათი': 'გუმათი',
  'სულორი': 'სულორი',
  'ნიკეა': 'ნიკეა',
  'საქვავილე': 'საქვავილე',
  'ბალახვანი': 'ბალახვანი',
  'უხიმერიონი': 'უხიმერიონი',
  'გაენათი': 'გაენათი',
  'ჯვარის უბანი': 'ჯვარის უბანი',
  'ცენტრი': 'ცენტრი',
  'თეთრი ხიდი': 'თეთრი ხიდი',
};

function ringToGeoJson(ring) {
  return ring.map((n) => [n.lon, n.lat]);
}

const features = [];

for (const el of data.elements) {
  if (el.type !== 'relation' || !el.members) continue;
  const ka = el.tags?.['name:ka'] || el.tags?.name;
  if (!ka) continue;

  const outerRings = [];
  for (const m of el.members) {
    if (m.role !== 'outer' || m.type !== 'way' || !m.geometry?.length) continue;
    outerRings.push(ringToGeoJson(m.geometry));
  }
  if (!outerRings.length) continue;

  const zoneName = NAME_MAP[ka] || ka;
  features.push({
    type: 'Feature',
    properties: {
      name: zoneName,
      osmId: el.id,
      osmName: ka,
    },
    geometry:
      outerRings.length === 1
        ? { type: 'Polygon', coordinates: [outerRings[0]] }
        : { type: 'MultiPolygon', coordinates: outerRings.map((r) => [r]) },
  });
}

const geojson = { type: 'FeatureCollection', features };
const outPath = join(__dirname, '../public/geo/kutaisi-zones.geojson');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${features.length} zones to ${outPath}`);
