const PRODUCTION_API_BASE = "https://vrgeorgia-api.onrender.com";

/**
 * Tour-builder UI → საერთო VR Georgia API (Express).
 * ლოკალურად: NEXT_PUBLIC_API_BASE=http://localhost:5000
 */
export function getTourApiBase(): string {
  const fromBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromBase) return fromBase.replace(/\/$/, "");

  const fromUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromUrl) {
    return fromUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return "http://localhost:5000";
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_BASE;
  }

  return "";
}

export function tourApiUrl(apiPath: string): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const base = getTourApiBase();
  if (!base) return path;
  return `${base}${path}`;
}

export function tourFetch(apiPath: string, init?: RequestInit): Promise<Response> {
  return fetch(tourApiUrl(apiPath), init);
}

/** ძველი relative `/api/uploads/...` ან სრული URL — viewer-ისთვის */
export function resolvePanoramaUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/api/")) {
    return tourApiUrl(imagePath);
  }
  return imagePath;
}
