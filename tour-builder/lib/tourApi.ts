import { readTourAuthToken } from "@/lib/tourAuth";

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
  const headers = new Headers(init?.headers || undefined);
  if (!headers.has("Authorization")) {
    const token = readTourAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(tourApiUrl(apiPath), { ...init, headers });
}

/**
 * R2 public host (media.vhome.ge) has no CORS — Photo Sphere / WebGL needs
 * same-origin `/api/media/raw` (or API host) proxy.
 */
function needsPanoramaCorsProxy(absoluteUrl: string): boolean {
  const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(
    /\/$/,
    ""
  );
  if (r2Base && absoluteUrl.startsWith(r2Base)) return true;
  try {
    const host = new URL(absoluteUrl).hostname.toLowerCase();
    if (host === "media.vhome.ge") return true;
    if (host.endsWith(".r2.dev")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** ძველი relative `/api/uploads/...` ან სრული URL — viewer-ისთვის */
export function resolvePanoramaUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "";
  let absolute = imagePath;
  if (/^https?:\/\//i.test(imagePath)) {
    absolute = imagePath;
  } else if (imagePath.startsWith("/api/")) {
    absolute = tourApiUrl(imagePath);
  } else {
    return imagePath;
  }
  if (needsPanoramaCorsProxy(absolute)) {
    const q = new URLSearchParams({ url: absolute });
    return tourApiUrl(`/api/media/raw?${q.toString()}`);
  }
  return absolute;
}
