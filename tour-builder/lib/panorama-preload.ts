const preloaded = new Set<string>();

/** Warm browser cache for panorama URLs (HTTP cache + decode) */
export function preloadPanoramas(urls: string[]): void {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

export function clearPreloadCache(): void {
  preloaded.clear();
}
