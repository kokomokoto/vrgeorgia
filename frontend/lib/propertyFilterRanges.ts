import type { Property } from './types';

export type FilterRange = { min: number; max: number };

/** ფასის ფილტრი — default სრული ფასი, არა raw price ველი */
export function resolvePriceFilterType(priceType?: string): 'total' | 'per_sqm' {
  return priceType === 'per_sqm' ? 'per_sqm' : 'total';
}

function getAreaForPrice(p: Property): number {
  const sqm = p.sqm != null && p.sqm > 0 ? p.sqm : 0;
  const houseSqm = p.houseSqm != null && p.houseSqm > 0 ? p.houseSqm : 0;
  return sqm || houseSqm;
}

function effectivePrice(
  p: Property,
  priceType: string | undefined,
  filterCurrency: 'USD' | 'GEL',
  usdToGel: number
): number | null {
  const areaSqm = getAreaForPrice(p);
  let base: number | null;

  if (priceType === 'per_sqm') {
    if (areaSqm <= 0) return null;
    base = p.priceType === 'per_sqm' ? p.price : p.price / areaSqm;
  } else if (priceType === 'total') {
    base = p.priceType === 'per_sqm' ? (areaSqm > 0 ? p.price * areaSqm : null) : p.price;
    if (base == null) return null;
  } else {
    base = p.price;
  }

  if (!Number.isFinite(base) || base <= 0) return null;

  const native: 'USD' | 'GEL' = p.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  if (filterCurrency === native) return Math.round(base);
  if (native === 'USD' && filterCurrency === 'GEL') return Math.round(base * usdToGel);
  return Math.round(base / usdToGel);
}

function collectAreas(p: Property): number[] {
  const out: number[] = [];
  if (p.sqm != null && p.sqm > 0) out.push(p.sqm);
  if (p.houseSqm != null && p.houseSqm > 0) out.push(p.houseSqm);
  return out;
}

export function collectPropertyPrices(
  properties: Property[],
  opts: { priceCurrency?: string; priceType?: string; usdToGel: number }
): number[] {
  const filterCurrency: 'USD' | 'GEL' = opts.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  const effectivePriceType = resolvePriceFilterType(opts.priceType);
  const prices: number[] = [];
  for (const p of properties) {
    const ep = effectivePrice(p, effectivePriceType, filterCurrency, opts.usdToGel);
    if (ep != null) prices.push(ep);
  }
  return prices;
}

export function collectPropertyAreas(properties: Property[]): number[] {
  const areas: number[] = [];
  for (const p of properties) {
    areas.push(...collectAreas(p));
  }
  return areas;
}

export function computeHistogramBuckets(
  values: number[],
  min: number,
  max: number,
  bucketCount = 28
): number[] {
  const buckets = Array.from({ length: bucketCount }, () => 0);
  if (!values.length || min >= max) return buckets;

  const span = max - min;
  for (const v of values) {
    if (v < min || v > max) continue;
    let idx = Math.floor(((v - min) / span) * bucketCount);
    if (idx >= bucketCount) idx = bucketCount - 1;
    if (idx < 0) idx = 0;
    buckets[idx] += 1;
  }
  return buckets;
}

export function computePropertyFilterRanges(
  properties: Property[],
  opts: { priceCurrency?: string; priceType?: string; usdToGel: number }
): { price: FilterRange | null; area: FilterRange | null } {
  const filterCurrency: 'USD' | 'GEL' = opts.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  const effectivePriceType = resolvePriceFilterType(opts.priceType);
  const prices: number[] = [];
  const areas: number[] = [];

  for (const p of properties) {
    const ep = effectivePrice(p, effectivePriceType, filterCurrency, opts.usdToGel);
    if (ep != null) prices.push(ep);
    areas.push(...collectAreas(p));
  }

  return {
    price: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    area: areas.length ? { min: Math.min(...areas), max: Math.max(...areas) } : null,
  };
}

export function rangeStep(span: number, kind: 'price' | 'area'): number {
  if (kind === 'area') {
    if (span <= 50) return 1;
    if (span <= 200) return 5;
    return 10;
  }
  if (span <= 1000) return 10;
  if (span <= 10000) return 100;
  if (span <= 100000) return 1000;
  if (span <= 1000000) return 5000;
  return 10000;
}

export function snapRangeBounds(rawMin: number, rawMax: number, step: number): FilterRange {
  if (rawMin >= rawMax) return { min: rawMin, max: rawMin + step };
  let hi = Math.ceil(rawMax / step) * step;
  if (hi <= rawMin) hi = rawMin + step;
  return { min: rawMin, max: hi };
}

export function clampToStep(value: number, min: number, max: number, step: number): number {
  const snapped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, snapped));
}
