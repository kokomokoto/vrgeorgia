export const ANALYTICS_PERIOD_OPTIONS = [
  { value: '1d', days: 1, label: '1 დღე' },
  { value: '7d', days: 7, label: '7 დღე' },
  { value: '30d', days: 30, label: '30 დღე' },
  { value: '90d', days: 90, label: '90 დღე' },
  { value: '360d', days: 360, label: '360 დღე' },
] as const;

export type AnalyticsPeriodValue = (typeof ANALYTICS_PERIOD_OPTIONS)[number]['value'];

export function periodLabel(days: number): string {
  const found = ANALYTICS_PERIOD_OPTIONS.find((o) => o.days === days);
  return found ? found.label : `${days} დღე`;
}
