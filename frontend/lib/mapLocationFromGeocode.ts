import { CITY_REGION_MAP } from '@/lib/georgiaLocations';
import { CITY_DISTRICTS_MAP, CITIES_WITH_DISTRICTS } from '@/components/TbilisiDistrictSelector';
import { formatNominatimResult, type NominatimAddress, type NominatimResult } from '@/lib/reverseGeocode';
import { lookupTbilisiUbaniAtPoint, normalizeTbilisiSubdistrictKa } from '@/lib/tbilisiUbaniLookup';

export type ParsedMapLocation = {
  label: string;
  city: string;
  region: string;
  street: string;
  tbilisiDistrict: string;
  tbilisiSubdistricts: string[];
};

const CITY_ALIASES: Record<string, string> = {
  tbilisi: 'თბილისი',
  'tbilisi city': 'თბილისი',
  batumi: 'ბათუმი',
  kutaisi: 'ქუთაისი',
  rustavi: 'რუსთავი',
  poti: 'ფოთი',
  zugdidi: 'ზუგდიდი',
  telavi: 'თელავი',
  gori: 'გორი',
  mtskheta: 'მცხეთა',
  kobuleti: 'ქობულეთი',
  ozurgeti: 'ოზურგეთი',
  akhaltsikhe: 'ახალციხე',
  senaki: 'სენაკი',
  zestaponi: 'ზესტაფონი',
  khashuri: 'ხაშური',
  marneuli: 'მარნეული',
  samtredia: 'სამტრედია',
  tkibuli: 'ტყიბული',
};

function normalizeGeoText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function collectAddressParts(address?: NominatimAddress, displayName?: string): string[] {
  const parts: string[] = [];
  if (address) {
    for (const key of [
      'house_number',
      'road',
      'neighbourhood',
      'suburb',
      'quarter',
      'city_district',
      'borough',
      'city',
      'town',
      'village',
      'municipality',
      'county',
      'state',
    ] as const) {
      const value = address[key];
      if (value) parts.push(value);
    }
  }
  if (displayName) {
    parts.push(...displayName.split(',').map((p) => p.trim()).filter(Boolean));
  }
  return [...new Set(parts.filter(Boolean))];
}

function resolveCity(parts: string[]): string {
  const normalizedParts = parts.map(normalizeGeoText);

  for (const cityName of Object.keys(CITY_REGION_MAP)) {
    const normCity = normalizeGeoText(cityName);
    if (normalizedParts.some((p) => p === normCity || p.includes(normCity) || normCity.includes(p))) {
      return cityName;
    }
  }

  for (const part of normalizedParts) {
    const aliasCity = CITY_ALIASES[part];
    if (aliasCity) return aliasCity;
    for (const [alias, cityName] of Object.entries(CITY_ALIASES)) {
      if (part.includes(alias) || alias.includes(part)) return cityName;
    }
  }

  const raw =
    parts.find((p) => Object.keys(CITY_REGION_MAP).some((city) => normalizeGeoText(city) === normalizeGeoText(p))) ||
    parts.find((p) => CITY_ALIASES[normalizeGeoText(p)]) ||
    '';

  if (raw && CITY_ALIASES[normalizeGeoText(raw)]) return CITY_ALIASES[normalizeGeoText(raw)];
  return raw;
}

function resolveRegion(city: string): string {
  if (city && CITY_REGION_MAP[city]) return CITY_REGION_MAP[city];
  return '';
}

function extractStreet(address?: NominatimAddress, label?: string, city?: string): string {
  if (address?.road) {
    let line = address.road;
    if (address.house_number) line += ` ${address.house_number}`;
    return line;
  }
  if (label) {
    const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const cityNorm = city ? normalizeGeoText(city) : '';
      const withoutCity = cityNorm
        ? parts.filter((p) => normalizeGeoText(p) !== cityNorm && !normalizeGeoText(p).includes(cityNorm))
        : parts.slice(0, -1);
      if (withoutCity.length) return withoutCity.join(', ');
    }
  }
  return address?.neighbourhood || address?.suburb || '';
}

function matchDistrictForCity(
  city: string,
  parts: string[],
): { tbilisiDistrict: string; tbilisiSubdistricts: string[] } {
  if (!CITIES_WITH_DISTRICTS.includes(city)) {
    return { tbilisiDistrict: '', tbilisiSubdistricts: [] };
  }

  const districts = CITY_DISTRICTS_MAP[city];
  if (!districts) return { tbilisiDistrict: '', tbilisiSubdistricts: [] };

  const haystack = parts.map(normalizeGeoText).join(' | ');

  for (const [districtKey, district] of Object.entries(districts)) {
    for (const sub of district.subdistricts) {
      const subNorm = normalizeGeoText(sub.ka);
      if (subNorm.length >= 3 && haystack.includes(subNorm)) {
        return { tbilisiDistrict: districtKey, tbilisiSubdistricts: [sub.ka] };
      }
      const shortKey = sub.key.replace(/^sub_/, '').replace(/_/g, ' ');
      const shortNorm = normalizeGeoText(shortKey);
      if (shortNorm.length >= 4 && haystack.includes(shortNorm)) {
        return { tbilisiDistrict: districtKey, tbilisiSubdistricts: [sub.ka] };
      }
    }
  }

  return { tbilisiDistrict: '', tbilisiSubdistricts: [] };
}

export function mergeParsedLocation(
  parsed: ParsedMapLocation,
  cityToRegion: Record<string, string> = CITY_REGION_MAP,
) {
  const city = parsed.city;
  let region = parsed.region;
  if (city) {
    region = cityToRegion[city] || region || CITY_REGION_MAP[city] || '';
    if (city.toLowerCase() === 'თბილისი') region = 'tbilisi';
  }

  const hasDistrictCity = city ? CITIES_WITH_DISTRICTS.includes(city) : false;

  return {
    city,
    region,
    street: parsed.street,
    tbilisiDistrict: hasDistrictCity ? parsed.tbilisiDistrict : '',
    tbilisiSubdistricts: hasDistrictCity ? parsed.tbilisiSubdistricts : [],
    label: parsed.label,
  };
}

export function parseLocationFromNominatim(result: NominatimResult): ParsedMapLocation {
  const label = formatNominatimResult(result);
  const parts = collectAddressParts(result.address, result.display_name);
  const city = resolveCity(parts);
  const region = resolveRegion(city);
  const street = extractStreet(result.address, label, city);
  const districtMatch = city ? matchDistrictForCity(city, parts) : { tbilisiDistrict: '', tbilisiSubdistricts: [] as string[] };

  return {
    label,
    city,
    region,
    street,
    tbilisiDistrict: districtMatch.tbilisiDistrict,
    tbilisiSubdistricts: districtMatch.tbilisiSubdistricts,
  };
}

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<ParsedMapLocation | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?` +
    `lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}` +
    `&format=json&addressdetails=1&zoom=18`;
  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'ka,en',
      },
    });
    if (!res.ok) return null;
    const data: NominatimResult = await res.json();
    if ((data as { error?: string }).error) return null;
    return parseLocationFromNominatim(data);
  } catch {
    return null;
  }
}

/** რუკაზე წერტილიდან — Nominatim + MSDA უბნის polygon lookup (თბილისი) */
export async function resolveLocationFromCoords(
  lat: number,
  lng: number,
  cityToRegion: Record<string, string> = CITY_REGION_MAP,
): Promise<ReturnType<typeof mergeParsedLocation> | null> {
  const [nominatimParsed, tbilisiZone] = await Promise.all([
    reverseGeocodeLocation(lat, lng),
    lookupTbilisiUbaniAtPoint(lat, lng).catch(() => null),
  ]);

  if (!nominatimParsed && !tbilisiZone) return null;

  const base = nominatimParsed
    ? mergeParsedLocation(nominatimParsed, cityToRegion)
    : mergeParsedLocation(
        {
          label: '',
          city: 'თბილისი',
          region: 'tbilisi',
          street: '',
          tbilisiDistrict: '',
          tbilisiSubdistricts: [],
        },
        cityToRegion,
      );

  if (tbilisiZone) {
    return {
      ...base,
      city: 'თბილისი',
      region: 'tbilisi',
      tbilisiDistrict: tbilisiZone.districtKey,
      tbilisiSubdistricts: [tbilisiZone.ka],
    };
  }

  if (base.tbilisiSubdistricts?.length) {
    return {
      ...base,
      tbilisiSubdistricts: base.tbilisiSubdistricts.map(normalizeTbilisiSubdistrictKa),
    };
  }

  return base;
}

/** მისამართის ძებნიდან არჩევა — კოორდინატებით MSDA უბანი + Nominatim ტექსტი */
export async function resolveLocationFromSearchPick(
  lat: number,
  lng: number,
  searchResult: NominatimResult,
  cityToRegion: Record<string, string> = CITY_REGION_MAP,
): Promise<ReturnType<typeof mergeParsedLocation>> {
  const fromSearch = mergeParsedLocation(parseLocationFromNominatim(searchResult), cityToRegion);
  const fromCoords = await resolveLocationFromCoords(lat, lng, cityToRegion);

  if (!fromCoords) return fromSearch;

  return {
    ...fromCoords,
    label: fromSearch.label || fromCoords.label,
    street: fromSearch.street || fromCoords.street,
    city: fromCoords.city || fromSearch.city,
    region: fromCoords.region || fromSearch.region,
    tbilisiDistrict: fromCoords.tbilisiDistrict || fromSearch.tbilisiDistrict,
    tbilisiSubdistricts: fromCoords.tbilisiSubdistricts.length
      ? fromCoords.tbilisiSubdistricts
      : fromSearch.tbilisiSubdistricts,
  };
}
