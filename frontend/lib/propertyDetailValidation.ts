const YEAR_MIN = 1800;
const YEAR_MAX = 2100;

export function parseOptionalPositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export function parseYearValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function isCompleteYear(n: number): boolean {
  return n >= YEAR_MIN && n <= YEAR_MAX;
}

/** ბინის სართული ≤ სულ სართული */
export function clampFloorField(floor: string, totalFloors: string): string {
  const f = parseOptionalPositiveInt(floor);
  const t = parseOptionalPositiveInt(totalFloors);
  if (f === null || t === null) return floor;
  if (f > t) return String(t);
  return floor;
}

export function applyTotalFloorsChange(
  totalFloors: string,
  _floor: string
): { floor: string; totalFloors: string } {
  // Do not clamp floor while totalFloors is being typed (e.g. "1" before "12").
  return { totalFloors, floor: _floor };
}

/** Clamp floor after totalFloors input is finished (blur/submit). */
export function finalizeFloorAfterTotalChange(
  totalFloors: string,
  floor: string
): { floor: string; totalFloors: string } {
  return {
    totalFloors,
    floor: clampFloorField(floor, totalFloors),
  };
}

export function applyFloorChange(floor: string, totalFloors: string): string {
  return clampFloorField(floor, totalFloors);
}

/** რემონტის წელი ≥ მშენებლობის წელი (მხოლოდ სრული, ვალიდური წლები) */
export function clampRenovationField(renovationYear: string, constructionYear: string): string {
  const r = parseYearValue(renovationYear);
  const c = parseYearValue(constructionYear);
  if (r === null || c === null || !isCompleteYear(r) || !isCompleteYear(c)) return renovationYear;
  if (r < c) return String(c);
  return renovationYear;
}

export function applyConstructionYearChange(
  constructionYear: string,
  renovationYear: string
): { constructionYear: string; renovationYear: string } {
  return {
    constructionYear,
    renovationYear: clampRenovationField(renovationYear, constructionYear),
  };
}

export function applyRenovationYearChange(renovationYear: string, constructionYear: string): string {
  return clampRenovationField(renovationYear, constructionYear);
}

export function floorExceedsTotal(floor: string, totalFloors: string): boolean {
  const f = parseOptionalPositiveInt(floor);
  const t = parseOptionalPositiveInt(totalFloors);
  return f !== null && t !== null && f > t;
}

export function renovationBeforeConstruction(renovationYear: string, constructionYear: string): boolean {
  const r = parseYearValue(renovationYear);
  const c = parseYearValue(constructionYear);
  if (r === null || c === null || !isCompleteYear(r) || !isCompleteYear(c)) return false;
  return r < c;
}

export function getFloorInputMax(totalFloors: string): number | undefined {
  return parseOptionalPositiveInt(totalFloors) ?? undefined;
}

export function getRenovationInputMin(constructionYear: string): number | undefined {
  const c = parseYearValue(constructionYear);
  if (c === null || !isCompleteYear(c)) return undefined;
  return c;
}

export type DetailValidationError = 'floor_exceeds_total' | 'renovation_before_construction';

export function validateDetailFields(
  floor: string,
  totalFloors: string,
  constructionYear: string,
  renovationYear: string
): DetailValidationError | null {
  if (floorExceedsTotal(floor, totalFloors)) return 'floor_exceeds_total';
  if (renovationBeforeConstruction(renovationYear, constructionYear)) {
    return 'renovation_before_construction';
  }
  return null;
}
