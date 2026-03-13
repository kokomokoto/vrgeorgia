// ავტომატური თარგმანის სერვისი
// იყენებს უფასო MyMemory API-ს ან LibreTranslate-ს

const CACHE_KEY = 'translations_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 საათი

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
  tr: 'tr', // თურქული
  az: 'az', // აზერბაიჯანული
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
    // MyMemory API - უფასო, 1000 სიტყვა/დღე, შემდეგ rate limit
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
    );
    
    if (!response.ok) throw new Error('Translation failed');
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      
      // ქეშში შენახვა
      cache[cacheKey] = { text: translated, timestamp: Date.now() };
      setCache(cache);
      
      return translated;
    }
    
    throw new Error('No translation');
  } catch (error) {
    console.warn('Translation error:', error);
    // Fallback: დავაბრუნოთ ორიგინალი
    return text;
  }
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
    if (fromLang === toLang || !text) {
      setTranslated(text);
      return;
    }

    setLoading(true);
    translateText(text, fromLang, toLang)
      .then(setTranslated)
      .finally(() => setLoading(false));
  }, [text, fromLang, toLang]);

  return { translated, loading };
}
