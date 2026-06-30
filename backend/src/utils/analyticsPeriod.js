/** ანალიტიკის პერიოდი query პარამეტრიდან (1d, 7d, 30d, 90d, 360d) */
export function parseAnalyticsPeriodDays(period, defaultDays = 30) {
  const map = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '360d': 360,
  };
  if (typeof period === 'string' && map[period] != null) return map[period];
  return defaultDays;
}

export function analyticsPeriodStartDate(periodDays) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}
