import type { FiltersState } from '@/components/Filters';

/** ძიების ველი → q ან propertyId (ID მხოლოდ 100000+) */
export function parseSearchInputValue(raw: string): Pick<FiltersState, 'q' | 'propertyId'> {
  const trimmed = raw.trim();
  const num = Number(trimmed);
  const isListingNumericId =
    /^\d+$/.test(trimmed) && !Number.isNaN(num) && num >= 100000;
  if (isListingNumericId) {
    return { q: '', propertyId: trimmed };
  }
  return { q: raw, propertyId: '' };
}

export function searchInputDisplayValue(
  filters: Pick<FiltersState, 'q' | 'propertyId'>
): string {
  return filters.q || filters.propertyId || '';
}
