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
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  borough?: string;
};

type NominatimResult = {
  display_name: string;
  address?: NominatimAddress;
  error?: string;
};

export type { NominatimAddress, NominatimResult };

/**
 * Nominatim-ის `accept-language` საიტის ენის მიხედვით: მიმდინარე ენა ჯერ,
 * შემდეგ fallback-ები. ასე რუკის ძებნა/რევერსი იმ ენაზე აბრუნებს შედეგს,
 * რომელზეც საიტია გადართული.
 */
export function acceptLanguageForSite(lang?: string): string {
  const primary = (lang || 'ka').split('-')[0].toLowerCase();
  const order = [primary, 'ka', 'en', 'ru'];
  return [...new Set(order)].join(',');
}

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
export async function reverseGeocodeLabel(lat: number, lng: number, lang?: string): Promise<string> {
  const acceptLang = acceptLanguageForSite(lang);
  const url =
    `https://nominatim.openstreetmap.org/reverse?` +
    `lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}` +
    `&format=json&addressdetails=1&zoom=18&accept-language=${encodeURIComponent(acceptLang)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': acceptLang,
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
