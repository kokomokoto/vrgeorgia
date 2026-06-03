/** გამოქვეყნებული 3D ტურის საჯარო მისამართი (Render / production) */
export function getTourBuilderPublicBase() {
  const base =
    process.env.TOUR_BUILDER_PUBLIC_URL ||
    process.env.PUBLIC_TOUR_BUILDER_URL ||
    'https://vrgeorgia-api.onrender.com';
  return base.replace(/\/$/, '');
}

/** tour-builder-ის /v/{uuid} ბმული — production-ზე ყოველთვის საჯარო API host */
export function normalizeTourLink(link) {
  if (!link || typeof link !== 'string') return '';
  const trimmed = link.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/v\/([0-9a-f-]{36})/i);
  if (!match) return trimmed;
  if (process.env.NODE_ENV !== 'production') {
    return trimmed;
  }
  return `${getTourBuilderPublicBase()}/v/${match[1]}`;
}

export function isLocalTourLink(link) {
  if (!link || typeof link !== 'string') return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(link);
}
