import type { Property } from './types';

type TFn = (key: string) => string;

export function getDealTypeLabel(dealType: Property['dealType'], t: TFn): string {
  if (dealType === 'rent') return t('deal_rent');
  if (dealType === 'mortgage') return t('deal_mortgage');
  return t('deal_sale');
}

/** მაგ: სასტუმრო-იყიდება */
export function getTypeDealBadge(p: Property, t: TFn): string {
  const typeLabel = t(p.type) || p.type;
  const dealLabel = getDealTypeLabel(p.dealType, t);
  return `${typeLabel}-${dealLabel}`;
}

/** ძებნილი/რუკის მისამართიდან ქუჩის ნაწილი (ბოლო ნაწილი ხშირად ქალაქია) */
export function splitStreetFromFullAddress(address: string, city?: string): string {
  const trimmed = address.trim();
  if (!trimmed) return '';
  const cityTrim = city?.trim();
  if (cityTrim) {
    const escaped = cityTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withoutCity = trimmed.replace(new RegExp(`,?\\s*${escaped}\\s*$`, 'i'), '').trim();
    if (withoutCity) return withoutCity;
  }
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, -1).join(', ');
  return trimmed;
}

/** ქუჩა — ჯერ შენახული street, შემდეგ უბანი/რაიონი */
export function getPropertyStreetLine(p: Property): string {
  if (p.street?.trim()) return p.street.trim();
  if (p.tbilisiSubdistricts?.length) return p.tbilisiSubdistricts.join(', ');
  if (p.tbilisiDistrict?.trim()) return p.tbilisiDistrict.trim();
  return '';
}

function pushUniqueLocationPart(parts: string[], value?: string | null) {
  const v = (value || '').trim();
  if (!v) return;
  const key = v.toLowerCase();
  if (parts.some((part) => part.toLowerCase() === key)) return;
  parts.push(v);
}

/**
 * აგენტის/მფლობელის სიაში: ქალაქი, რეგიონი, შემდეგ რაიონი/უბანი/ქუჩა თუ არის.
 * ერთნაირ ტექსტს ორჯერ არ ამატებს (მაგ. city === region).
 */
export function getPropertyOwnerLocationLine(p: Property): string {
  const parts: string[] = [];
  pushUniqueLocationPart(parts, p.city);
  pushUniqueLocationPart(parts, p.region);
  pushUniqueLocationPart(parts, p.tbilisiDistrict);
  for (const sub of p.tbilisiSubdistricts || []) {
    pushUniqueLocationPart(parts, sub);
  }
  let street = p.street?.trim() || '';
  if (street) {
    street = splitStreetFromFullAddress(street, p.city);
    street = splitStreetFromFullAddress(street, p.region);
    for (const part of parts) {
      street = splitStreetFromFullAddress(street, part);
    }
  }
  pushUniqueLocationPart(parts, street);
  return parts.join(', ');
}

/** სრული მისამართი: ქუჩა, ქალაქი (როგორც ობიექტზეა მითითებული) */
export function getPropertyAddressLine(p: Property): string {
  const parts: string[] = [];
  const streetLine = getPropertyStreetLine(p);
  if (streetLine) parts.push(streetLine);
  if (p.city?.trim()) parts.push(p.city.trim());
  return parts.join(', ');
}

/**
 * ფასის გამოთვლისთვის:
 * ორივე ფართობი → სახლის ფართობი; მხოლოდ ერთი → ის.
 */
export function getAreaForPrice(p: Property): number {
  const sqm = p.sqm != null && p.sqm > 0 ? p.sqm : 0;
  const houseSqm = p.houseSqm != null && p.houseSqm > 0 ? p.houseSqm : 0;
  return houseSqm || sqm;
}

export function getPropertyPrices(p: Property): {
  currencySymbol: string;
  totalPrice: number | null;
  pricePerSqm: number | null;
} {
  const currencySymbol = p.priceCurrency === 'GEL' ? '₾' : '$';
  const areaSqm = getAreaForPrice(p);
  const isPerSqm = p.priceType === 'per_sqm';

  let totalPrice: number | null = null;
  let pricePerSqm: number | null = null;

  if (isPerSqm) {
    pricePerSqm = p.price;
    if (areaSqm > 0) totalPrice = Math.round(p.price * areaSqm);
  } else {
    totalPrice = p.price;
    if (areaSqm > 0) pricePerSqm = Math.round(p.price / areaSqm);
  }

  return { currencySymbol, totalPrice, pricePerSqm };
}

/** მაგ. 23480 → 23.48k */
export function formatSqmCompact(sqm: number): string {
  if (sqm >= 1000) {
    const k = sqm / 1000;
    if (k >= 100) return `${Math.round(k)}k`;
    const fixed = k.toFixed(2);
    return `${fixed.replace(/\.?0+$/, '')}k`;
  }
  return sqm.toLocaleString();
}

/** მაგ. 22 მაი 20:45 */
export function formatListedDate(createdAt?: string, lang = 'ka'): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const locale =
    lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-GB' : 'ka-GE';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
