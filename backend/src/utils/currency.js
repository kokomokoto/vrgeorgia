const FALLBACK_RATE = 2.75;
const CACHE_MS = 60 * 60 * 1000;

let cache = null;

function rateFromEnv() {
  const raw = process.env.USD_TO_GEL_RATE;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchFromExchangeRateApi() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.rates?.GEL);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=GEL');
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.rates?.GEL);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** USD → GEL კურსი — იგივე წყაროების რიგი რაც frontend-ს (სორტი = ჩვენება) */
export async function getUsdToGelRate() {
  const envRate = rateFromEnv();
  if (envRate) return envRate;

  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.rate;

  const rate =
    (await fetchFromExchangeRateApi()) ||
    (await fetchFromFrankfurter()) ||
    cache?.rate ||
    FALLBACK_RATE;

  cache = { rate, ts: Date.now() };
  return rate;
}
