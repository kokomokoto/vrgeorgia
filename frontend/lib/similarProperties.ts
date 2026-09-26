import type { Property } from '@/lib/types';
import { convertDisplayMoney, type DisplayCurrency } from '@/lib/currency';
import { getPropertyPrices } from '@/lib/propertyDisplay';

const DEFAULT_LIMIT = 6;
const SAME_STREET_SCORE = 10000;

function norm(value?: string) {
  return (value || '').trim().toLowerCase();
}

function streetTokens(value?: string): string[] {
  return norm(value)
    .split(/[\s,]+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((token) => token.length >= 2);
}

function houseNumber(tokens: string[]): string | null {
  const nums = tokens.filter((token) => /^\d+$/.test(token));
  return nums.length ? nums[nums.length - 1] : null;
}

/** ერთი და იგივე ქუჩა და ნომერი, მაშინაც კი თუ ერთი ჩანაწერი სრულ მისამართს ინახავს. */
export function sameStreetAddress(source: Property, candidate: Property): boolean {
  const drop = new Set(
    [source.city, source.region, candidate.city, candidate.region].map(norm).filter(Boolean)
  );
  const a = streetTokens(source.street).filter((token) => !drop.has(token));
  const b = streetTokens(candidate.street).filter((token) => !drop.has(token));
  if (a.length < 2 || b.length < 2) return false;

  const aNum = houseNumber(a);
  const bNum = houseNumber(b);
  if (Boolean(aNum) !== Boolean(bNum) || (aNum && bNum && aNum !== bNum)) return false;

  const aNames = a.filter((token) => !/^\d+$/.test(token));
  const bNames = b.filter((token) => !/^\d+$/.test(token));
  const [shorter, longer] = aNames.length <= bNames.length ? [aNames, bNames] : [bNames, aNames];
  if (shorter.length < 2) return false;
  const longerSet = new Set(longer);
  return shorter.every((token) => longerSet.has(token));
}

/** იგივე ქუჩა და ნომერი > უბანი > რაიონი > ქალაქი > რეგიონი */
export function similarLocationScore(source: Property, candidate: Property): number {
  let score = 0;
  if (sameStreetAddress(source, candidate)) score += SAME_STREET_SCORE;
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
