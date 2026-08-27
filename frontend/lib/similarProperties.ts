import type { Property } from '@/lib/types';
import { convertDisplayMoney, type DisplayCurrency } from '@/lib/currency';
import { getPropertyPrices } from '@/lib/propertyDisplay';

const DEFAULT_LIMIT = 6;

function norm(value?: string) {
  return (value || '').trim().toLowerCase();
}

/** უბანი > რაიონი > ქალაქი > რეგიონი */
export function similarLocationScore(source: Property, candidate: Property): number {
  let score = 0;
  const sourceSubs = new Set((source.tbilisiSubdistricts || []).map(norm).filter(Boolean));
  if (sourceSubs.size > 0) {
    const overlap = (candidate.tbilisiSubdistricts || []).some((s) => sourceSubs.has(norm(s)));
    if (overlap) score += 400;
  }
  if (source.tbilisiDistrict && source.tbilisiDistrict === candidate.tbilisiDistrict) {
    score += 300;
  }
  if (norm(source.city) && norm(source.city) === norm(candidate.city)) {
    score += 200;
  }
  if (source.region && source.region === candidate.region) {
    score += 100;
  }
  return score;
}

function totalPriceUsd(p: Property, usdToGel: number): number | null {
  const { totalPrice } = getPropertyPrices(p);
  if (totalPrice == null) return null;
  const from: DisplayCurrency = p.priceCurrency === 'GEL' ? 'GEL' : 'USD';
  return convertDisplayMoney(totalPrice, from, 'USD', usdToGel);
}

/**
 * პრიორიტეტი: გარიგება (ყიდვა/ქირა/გირაო) → ობიექტის ტიპი → ლოკაცია → ფასი.
 * გარიგების ტიპი არ ირევა.
 */
export function pickSimilarProperties(
  source: Property,
  candidates: Property[],
  opts: { limit?: number; usdToGel: number }
): Property[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const sourceUsd = totalPriceUsd(source, opts.usdToGel);

  return candidates
    .filter((p) => p._id !== source._id)
    .filter((p) => p.dealType === source.dealType)
    .map((p) => {
      const usd = totalPriceUsd(p, opts.usdToGel);
      const priceDelta =
        sourceUsd != null && usd != null ? Math.abs(usd - sourceUsd) : Number.POSITIVE_INFINITY;
      return {
        p,
        typeMatch: p.type === source.type ? 1 : 0,
        loc: similarLocationScore(source, p),
        priceDelta,
      };
    })
    .sort((a, b) => {
      if (b.typeMatch !== a.typeMatch) return b.typeMatch - a.typeMatch;
      if (b.loc !== a.loc) return b.loc - a.loc;
      if (a.priceDelta !== b.priceDelta) return a.priceDelta - b.priceDelta;
      return 0;
    })
    .slice(0, limit)
    .map((row) => row.p);
}

export function mergePropertyPools(...lists: Property[][]): Property[] {
  const seen = new Set<string>();
  const out: Property[] = [];
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p._id)) continue;
      seen.add(p._id);
      out.push(p);
    }
  }
  return out;
}
