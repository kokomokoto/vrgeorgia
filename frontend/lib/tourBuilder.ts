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
export function getTourBuilderEmbedUrl(userId?: string | null): string {
  const base = `${getTourBuilderOrigin()}/embed`;
  if (!userId) return base;
  return `${base}?userId=${encodeURIComponent(userId)}`;
}

export const VRGEORGIA_TOUR_STORAGE_KEY = 'vrgeorgia_pending_tour_link';

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
export function getTourEditUrl(tourId: string): string {
  return `${getTourBuilderOrigin()}/tours/${tourId}/edit?embed=1`;
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
