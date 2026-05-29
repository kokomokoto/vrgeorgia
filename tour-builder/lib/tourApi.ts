const PRODUCTION_API_BASE = "https://vrgeorgia-api.onrender.com";

function isSeparateTourDevServer(): boolean {
  if (typeof window === "undefined") return false;
  const port = window.location.port;
  return port === "3002" || port === "3007";
}

/**
 * Tour-builder UI → VR Georgia API (იგივე ჰოსტი merged deploy-ზე, ცალკე :5000 dev-ში).
 */
export function getTourApiBase(): string {
  const fromBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (fromBase) return fromBase.replace(/\/$/, "");

  const fromUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromUrl) {
    return fromUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    if (isSeparateTourDevServer()) {
      return "http://localhost:5000";
    }
    return window.location.origin;
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
