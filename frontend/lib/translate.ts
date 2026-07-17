// ავტომატური თარგმანის სერვისი
// იყენებს უფასო MyMemory API-ს ან LibreTranslate-ს

const CACHE_KEY = 'translations_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 საათი
const MAX_TRANSLATE_CHARS = 400;
const TRANSLATION_DELAY_MS = 120;

const inFlightTranslations = new Map<string, Promise<string>>();
let translationQueue = Promise.resolve();

interface TranslationCache {
  [key: string]: {
    text: string;
    timestamp: number;
  };
}

// ქეშის წაკითხვა localStorage-დან
function getCache(): TranslationCache {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

// ქეშში შენახვა
function setCache(cache: TranslationCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage სავსეა
  }
}

// ენის კოდების მეპინგი MyMemory-სთვის
const LANG_CODES: Record<string, string> = {
  ka: 'ka', // ქართული
  en: 'en', // ინგლისური
  ru: 'ru', // რუსული
};

/**
 * ტექსტის თარგმნა ერთი ენიდან მეორეზე
 * @param text - სათარგმნი ტექსტი
 * @param from - წყარო ენა (მაგ: 'ka')
 * @param to - სამიზნე ენა (მაგ: 'en')
 */
export async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string> {
  // თუ იგივე ენაა, დავაბრუნოთ ორიგინალი
  if (from === to || !text.trim()) return text;

  // ქეშის შემოწმება
  const cacheKey = `${from}:${to}:${text}`;
  const cache = getCache();
  const cached = cache[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.text;
  }

  const fromLang = LANG_CODES[from] || from;
  const toLang = LANG_CODES[to] || to;

  try {
    const translated = await translateLongText(text, fromLang, toLang);

    cache[cacheKey] = { text: translated, timestamp: Date.now() };
    setCache(cache);

    return translated;
  } catch (error) {
    console.warn('Translation error:', error);
    // Fallback: დავაბრუნოთ ორიგინალი
    return text;
  }
}

async function requestTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
  const key = `${fromLang}:${toLang}:${text}`;
  const existing = inFlightTranslations.get(key);
  if (existing) return existing;

  const task = (async () => {
    await translationQueue;
    translationQueue = new Promise((resolve) => setTimeout(resolve, TRANSLATION_DELAY_MS));

    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
    );

    if (!response.ok) throw new Error('Translation failed');

    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    throw new Error('No translation');
  })();

  inFlightTranslations.set(key, task);
  try {
    return await task;
  } finally {
    inFlightTranslations.delete(key);
  }
}

function splitForTranslation(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1 && text.length <= MAX_TRANSLATE_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  let current = '';

  const pushChunk = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if (paragraph.length > MAX_TRANSLATE_CHARS) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((current + ' ' + sentence).trim().length > MAX_TRANSLATE_CHARS) {
          pushChunk();
        }
        current = current ? `${current} ${sentence}` : sentence;
      }
      pushChunk();
      continue;
    }

    if ((current + '\n\n' + paragraph).trim().length > MAX_TRANSLATE_CHARS) {
      pushChunk();
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }

  pushChunk();
  return chunks.length ? chunks : [text];
}

async function translateLongText(text: string, fromLang: string, toLang: string): Promise<string> {
  if (text.length <= MAX_TRANSLATE_CHARS) {
    return requestTranslation(text, fromLang, toLang);
  }

  const chunks = splitForTranslation(text);
  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    translatedChunks.push(await requestTranslation(chunk, fromLang, toLang));
  }
  return translatedChunks.join('\n\n');
}

export function detectTextLanguage(text: string): string {
  const value = text.trim();
  if (!value) return 'ka';
  if (/[\u10A0-\u10FF]/.test(value)) return 'ka';
  if (/[\u0400-\u04FF]/.test(value)) return 'ru';
  return 'en';
}

/**
 * მრავალი ტექსტის თარგმნა ერთდროულად
 */
export async function translateMultiple(
  texts: string[],
  from: string,
  to: string
): Promise<string[]> {
  if (from === to) return texts;
  
  const results = await Promise.all(
    texts.map(text => translateText(text, from, to))
  );
  
  return results;
}

/**
 * React Hook ავტომატური თარგმანისთვის
 */
import { useState, useEffect } from 'react';

export function useAutoTranslate(
  text: string,
  fromLang: string,
  toLang: string
): { translated: string; loading: boolean } {
  const [translated, setTranslated] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sourceLang = fromLang === 'auto' ? detectTextLanguage(text) : fromLang;
    if (sourceLang === toLang || !text) {
      setTranslated(text);
      return;
    }

    setLoading(true);
    translateText(text, sourceLang, toLang)
      .then(setTranslated)
      .finally(() => setLoading(false));
  }, [text, fromLang, toLang]);

  return { translated, loading };
}
