import type { FiltersState } from '@/components/Filters';

/** განცხადების numericId: 100000–1099999 (6–7 ციფრი). ტელეფონი ჩვეულებრივ 9+ ციფრია. */
export function isListingNumericId(raw: string): boolean {
  const trimmed = String(raw).trim();
  if (!/^\d+$/.test(trimmed)) return false;
  if (trimmed.length < 6 || trimmed.length > 7) return false;
  const num = Number(trimmed);
  return !Number.isNaN(num) && num >= 100000 && num <= 1099999;
}

/** ძიების ველი → q ან propertyId (ID მხოლოდ listing დიაპაზონში; ტელეფონი → q) */
export function parseSearchInputValue(raw: string): Pick<FiltersState, 'q' | 'propertyId'> {
  const trimmed = raw.trim();
  if (isListingNumericId(trimmed)) {
    return { q: '', propertyId: trimmed };
  }
  return { q: raw, propertyId: '' };
}

export function searchInputDisplayValue(
  filters: Pick<FiltersState, 'q' | 'propertyId'>
): string {
  return filters.q || filters.propertyId || '';
}
