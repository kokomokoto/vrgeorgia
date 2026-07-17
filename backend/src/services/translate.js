// Translation service.
//
// Strategy (first provider that succeeds wins):
//   1. Google Cloud Translate  — used only if GOOGLE_CLOUD_PROJECT_ID is configured (paid, official).
//   2. Google free web endpoint — translate.googleapis.com (no key, generous practical limit).
//   3. MyMemory                — free public API, low daily limit (last resort).
//
// Results are meant to be persisted by the caller (Property.translations),
// so a given text is translated ONCE and then served from the database to every user.
// A small in-memory cache + serialized queue avoids duplicate/burst network calls.

const MEMORY_CACHE = new Map(); // key: `${to}:${text}` -> translated string
const MEMORY_CACHE_MAX = 5000;
const REQUEST_GAP_MS = 150; // throttle between outbound provider calls

let googleClient = null;
let queue = Promise.resolve();

async function getGoogleClient() {
  if (googleClient) return googleClient;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) return null;

  try {
    const mod = await import('@google-cloud/translate');
    const { Translate } = mod;
    googleClient = new Translate({ projectId });
    return googleClient;
  } catch {
    return null;
  }
}

/**
 * Detect the dominant script/language of a short text.
 * Returns 'ka' | 'ru' | 'en' (defaults to 'ka' when undetectable).
 */
export function detectLang(text) {
  const value = (text || '').trim();
  if (!value) return 'ka';
  const ka = (value.match(/[\u10A0-\u10FF]/g) || []).length;
  const cyr = (value.match(/[\u0400-\u04FF]/g) || []).length;
  const lat = (value.match(/[A-Za-z]/g) || []).length;
  if (ka > 0 && ka >= cyr && ka >= lat) return 'ka';
  if (cyr > 0 && cyr >= lat) return 'ru';
  if (lat > 0) return 'en';
  return 'ka';
}

function cacheKey(text, from, to) {
  return `${from}:${to}:${text}`;
}

function readCache(text, from, to) {
  return MEMORY_CACHE.get(cacheKey(text, from, to));
}

function writeCache(text, from, to, value) {
  if (MEMORY_CACHE.size >= MEMORY_CACHE_MAX) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    if (firstKey !== undefined) MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(cacheKey(text, from, to), value);
}

// Serialize outbound calls so we never burst a free provider.
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, REQUEST_GAP_MS)),
    () => new Promise((r) => setTimeout(r, REQUEST_GAP_MS))
  );
  return run;
}

async function translateViaGoogleCloud(text, from, to) {
  const client = await getGoogleClient();
  if (!client) return null;
  const [translated] = await client.translate(text, { from, to });
  return Array.isArray(translated) ? translated.join('\n') : translated;
}

// Unofficial Google endpoint used widely by open-source libs. No API key.
async function translateViaGoogleFree(text, from, to) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx' +
    `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`google-free ${res.status}`);
  const data = await res.json();
  // Shape: [[ [translatedChunk, originalChunk, ...], ... ], ...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('google-free bad shape');
  const out = data[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('');
  if (!out.trim()) throw new Error('google-free empty');
  return out;
}

async function translateViaMyMemory(text, from, to) {
  const email = process.env.MYMEMORY_EMAIL;
  const url =
    'https://api.mymemory.translated.net/get' +
    `?q=${encodeURIComponent(text)}&langpair=${from}|${to}` +
    (email ? `&de=${encodeURIComponent(email)}` : '');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (!out || /MYMEMORY WARNING/i.test(out)) throw new Error('mymemory limit/empty');
  return out;
}

// MyMemory has a per-request length cap (~500 chars). Split long text into chunks that,
// when concatenated with '', reproduce the original text exactly (separators are preserved).
function splitLongText(text, max = 480) {
  if (text.length <= max) return [text];

  // Tokens = "sentence/word + trailing whitespace"; each token keeps its own separators.
  const tokens = text.match(/\S+\s*|\s+/g) || [text];
  const chunks = [];
  let current = '';

  for (const token of tokens) {
    if (token.length > max) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let i = 0; i < token.length; i += max) {
        chunks.push(token.slice(i, i + max));
      }
      continue;
    }
    if ((current + token).length > max) {
      chunks.push(current);
      current = token;
    } else {
      current += token;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text];
}

async function translateChunk(text, from, to) {
  const providers = [translateViaGoogleCloud, translateViaGoogleFree, translateViaMyMemory];
  for (const provider of providers) {
    try {
      const result = await provider(text, from, to);
      if (result && result.trim()) return result;
    } catch {
      // try next provider
    }
  }
  return null;
}

/**
 * Translate `text` into `to`. The source language is auto-detected unless an
 * explicit `from` is given (pass 'auto' to force detection).
 * Returns the original text if translation is unavailable or already in `to`.
 */
export async function translateText(text, to, from = 'auto') {
  if (!text || !to) return text;

  const source = from && from !== 'auto' ? from : detectLang(text);
  if (source === to) return text; // already in the target language

  const cached = readCache(text, source, to);
  if (cached !== undefined) return cached;

  const chunks = splitLongText(text);
  const translatedChunks = [];
  let anySuccess = false;

  for (const chunk of chunks) {
    const translated = await enqueue(() => translateChunk(chunk, source, to));
    if (translated) {
      anySuccess = true;
      translatedChunks.push(translated);
    } else {
      translatedChunks.push(chunk); // keep original for this chunk
    }
  }

  if (!anySuccess) return text; // do not cache failures — allow retry later

  const result = translatedChunks.join('');
  writeCache(text, source, to, result);
  return result;
}
