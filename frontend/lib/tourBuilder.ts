import { getApiBase } from './config';

/** 3D ტური — API სერვისზე ჩაშენებული UI (ერთი Render სერვისი) */
const DEFAULT_PRODUCTION_TOUR_BUILDER =
  'https://vrgeorgia-api.onrender.com';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  );
}

function isProductionSiteHostname(hostname: string): boolean {
  return hostname === 'vrgeorgia.ge' || hostname.endsWith('.vrgeorgia.ge');
}

/** Render / production frontend — tour UI იმავე API ჰოსტზეა */
function isProductionAppHostname(hostname: string): boolean {
  return (
    isProductionSiteHostname(hostname) ||
    hostname === 'vrgeorgia-frontend.onrender.com' ||
    hostname === 'vrgeorgia.onrender.com' ||
    hostname === 'vrgeorgia-web.onrender.com'
  );
}

function isLocalTourUrl(url: string): boolean {
  try {
    return isLocalHostname(new URL(url).hostname);
  } catch {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url);
  }
}

/** ტური გამოქვეყნებულია production API-ზე — მონაცემები იქ არის */
function isProductionTourUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host === 'vrgeorgia-api.onrender.com' ||
      isProductionSiteHostname(host)
    );
  } catch {
    return /vrgeorgia-api\.onrender\.com/i.test(url);
  }
}

/**
 * tour-builder აპის მისამართი — რედაქტორის გახსნა, publish-ის ბმული.
 * ლოკალურად ტური ჩაშენებულია backend-ზე (:5000), არა ცალკე :3002.
 */
export function getTourBuilderOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TOUR_BUILDER_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (isProductionAppHostname(hostname)) {
      return DEFAULT_PRODUCTION_TOUR_BUILDER;
    }
    return getApiBase();
  }

  const apiEnv = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (apiEnv) return normalizeOrigin(apiEnv);
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5000';
  }
  return DEFAULT_PRODUCTION_TOUR_BUILDER;
}

/** ახალი ტაბში იხსნება — ტური იქმნება და რედაქტორში გადადის */
export function getTourBuilderEmbedUrl(
  userId?: string | null,
  sessionId?: string | null
): string {
  const base = `${getTourBuilderOrigin()}/embed`;
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  if (sessionId) params.set('session', sessionId);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export const VRGEORGIA_TOUR_STORAGE_KEY = 'vrgeorgia_pending_tour_link';
export const VRGEORGIA_TOUR_EMBED_SESSION_KEY = 'vrgeorgia_tour_embed_session';

/** Session id links tour-builder publish → upload/edit form (API polling fallback). */
export function getOrCreateTourEmbedSession(): string {
  if (typeof window === 'undefined') return '';
  try {
    let session = window.sessionStorage.getItem(VRGEORGIA_TOUR_EMBED_SESSION_KEY);
    if (!session) {
      session =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(VRGEORGIA_TOUR_EMBED_SESSION_KEY, session);
    }
    return session;
  } catch {
    return '';
  }
}

export function clearTourEmbedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(VRGEORGIA_TOUR_EMBED_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Poll backend for a tour link published from embed mode. */
export async function fetchPendingEmbedTourLink(
  sessionId: string
): Promise<{ url: string; tourId: string } | null> {
  const id = sessionId.trim();
  if (!id) return null;
  try {
    const res = await fetch(
      `${getApiBase()}/api/tour-embed/pending?sessionId=${encodeURIComponent(id)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string; tourId?: string };
    if (!data.url) return null;
    return { url: data.url, tourId: data.tourId || '' };
  } catch {
    return null;
  }
}

export function getPublishedTourUrl(tourId: string): string {
  return `${getTourBuilderOrigin()}/v/${tourId}`;
}

/** გამოქვეყნებული ბმულიდან (/v/{id}) ამოაქვს tourId — host-ის მიუხედვავად */
export function extractTourId(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const vMatch = publicUrl.match(/\/v\/([^/?#]+)/);
  if (vMatch) return vMatch[1];
  const editMatch = publicUrl.match(/\/tours\/([^/?#]+)\/edit/);
  return editMatch ? editMatch[1] : null;
}

function useLocalDevTourProxy(): boolean {
  if (typeof window !== 'undefined') {
    return isLocalHostname(window.location.hostname);
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * ბაზაში შენახული ბმული → iframe-ის საბოლოო URL.
 * ლოკალურ dev-ში პროდაქშენის ტური: localhost:5000/v/... (backend proxy → Render, CSP გასწორებული).
 */
export function resolveTourPublicUrl(storedUrl: string | null | undefined): string {
  const trimmed = (storedUrl || '').trim();
  if (!trimmed) return '';
  const id = extractTourId(trimmed);
  if (id) {
    if (isProductionTourUrl(trimmed) && useLocalDevTourProxy()) {
      return `${getApiBase()}/v/${id}`;
    }
    if (isProductionTourUrl(trimmed)) {
      return `${DEFAULT_PRODUCTION_TOUR_BUILDER}/v/${id}`;
    }
    return getPublishedTourUrl(id);
  }
  if (isLocalTourUrl(trimmed)) return '';
  return trimmed;
}

/** არსებული ტურის რედაქტირების ბმული embed რეჟიმში */
export function getTourEditUrl(tourId: string, sessionId?: string | null): string {
  const params = new URLSearchParams({ embed: '1' });
  if (sessionId) params.set('session', sessionId);
  return `${getTourBuilderOrigin()}/tours/${tourId}/edit?${params.toString()}`;
}

export const VRGEORGIA_TOUR_MESSAGE = 'VRGEORGIA_TOUR_PUBLISHED' as const;

export type VrGeorgiaTourPublishedMessage = {
  type: typeof VRGEORGIA_TOUR_MESSAGE;
  url: string;
  tourId: string;
};

export function isTourPublishedMessage(
  data: unknown
): data is VrGeorgiaTourPublishedMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as VrGeorgiaTourPublishedMessage).type === VRGEORGIA_TOUR_MESSAGE &&
    typeof (data as VrGeorgiaTourPublishedMessage).url === 'string'
  );
}
