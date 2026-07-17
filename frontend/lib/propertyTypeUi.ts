import type { PropertyType } from '@/lib/types';

export function isLandType(type: string | PropertyType | undefined | null): boolean {
  return type === 'land';
}

export const LAND_STATUS_OPTIONS = [
  { value: 'agricultural' as const, labelKey: 'land_status_agricultural' },
  { value: 'non_agricultural' as const, labelKey: 'land_status_non_agricultural' },
];
