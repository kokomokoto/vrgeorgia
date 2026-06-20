const FALLBACK_RATE = 2.75;
const CACHE_MS = 60 * 60 * 1000;

let cache = null;

function rateFromEnv() {
  const raw = process.env.USD_TO_GEL_RATE;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** USD → GEL კურსი (env, API ქეში, fallback — frontend-ის მსგავსად) */
export async function getUsdToGelRate() {
  const envRate = rateFromEnv();
  if (envRate) return envRate;

  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.rate;

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GEL');
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.GEL;
      if (rate && rate > 0) {
        cache = { rate, ts: Date.now() };
        return rate;
      }
    }
  } catch {
    // ignore — fallback below
  }

  return cache?.rate ?? FALLBACK_RATE;
}
