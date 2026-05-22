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

/** სრული მისამართი: ქუჩა, ქალაქი (როგორც ობიექტზეა მითითებული) */
export function getPropertyAddressLine(p: Property): string {
  const parts: string[] = [];
  const streetLine = getPropertyStreetLine(p);
  if (streetLine) parts.push(streetLine);
  if (p.city?.trim()) parts.push(p.city.trim());
  return parts.join(', ');
}

export function getPropertyPrices(p: Property): {
  currencySymbol: string;
  totalPrice: number | null;
  pricePerSqm: number | null;
} {
  const currencySymbol = p.priceCurrency === 'GEL' ? '₾' : '$';
  const sqm = p.sqm && p.sqm > 0 ? p.sqm : 0;
  const isPerSqm = p.priceType === 'per_sqm';

  let totalPrice: number | null = null;
  let pricePerSqm: number | null = null;

  if (isPerSqm) {
    pricePerSqm = p.price;
    if (sqm > 0) totalPrice = Math.round(p.price * sqm);
  } else {
    totalPrice = p.price;
    if (sqm > 0) pricePerSqm = Math.round(p.price / sqm);
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

const KA_MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

/** მაგ. 22 მაი 20:45 */
export function formatListedDate(createdAt?: string): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = KA_MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${hh}:${mm}`;
}
