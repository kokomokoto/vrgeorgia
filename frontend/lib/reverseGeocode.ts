/**
 * Nominatim (OSM) — რევერსი/ფორვარდი ფორმატირება
 * https://nominatim.org/release-docs/latest/api/Reverse/
 */

type NominatimAddress = {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  neighbourhood?: string;
  suburb?: string;
};

type NominatimResult = {
  display_name: string;
  address?: NominatimAddress;
  error?: string;
};

export function formatNominatimResult(result: NominatimResult): string {
  if (result.address) {
    const a = result.address;
    const parts: string[] = [];
    if (a.road) {
      let line = a.road;
      if (a.house_number) line += ` ${a.house_number}`;
      parts.push(line);
    } else if (a.neighbourhood || a.suburb) {
      parts.push(a.neighbourhood || a.suburb || '');
    }
    const place = a.city || a.town || a.village;
    if (place) parts.push(place);
    if (a.state && !parts.includes(a.state)) parts.push(a.state);
    const joined = parts.filter(Boolean).join(', ');
    if (joined) return joined;
  }
  return result.display_name;
}

/**
 * კოორდინატიდან მოკლე მისამართი/ქუჩა (საქართველო)
 */
export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string> {
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
    if (!res.ok) return '';
    const data: NominatimResult = await res.json();
    if ((data as { error?: string }).error) return '';
    return formatNominatimResult(data);
  } catch {
    return '';
  }
}
