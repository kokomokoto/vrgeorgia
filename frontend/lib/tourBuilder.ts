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

/**
 * tour-builder აპის მისამართი — რედაქტორის გახსნა, publish-ის ბმული.
 * პროდაქშენზე არასოდეს აბრუნებს localhost-ს.
 */
export function getTourBuilderOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TOUR_BUILDER_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (isLocalHostname(hostname)) {
      return `${protocol}//${hostname}:3002`;
    }
    if (isProductionSiteHostname(hostname)) {
      return DEFAULT_PRODUCTION_TOUR_BUILDER;
    }
    // LAN / სხვა დომენი — იგივე host, tour-builder პორტი
    return `${protocol}//${hostname}:3002`;
  }

  // SSR production build
  return DEFAULT_PRODUCTION_TOUR_BUILDER;
}

/** ახალი ტაბში იხსნება — ტური იქმნება და რედაქტორში გადადის */
export function getTourBuilderEmbedUrl(): string {
  return `${getTourBuilderOrigin()}/?from=vrgeorgia`;
}

export const VRGEORGIA_TOUR_STORAGE_KEY = 'vrgeorgia_pending_tour_link';

export function getPublishedTourUrl(tourId: string): string {
  return `${getTourBuilderOrigin()}/v/${tourId}`;
}

/** გამოქვეყნებული ბმულიდან (/v/{id}) ამოაქვს tourId — host-ის მიუხედვავად */
export function extractTourId(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const match = publicUrl.match(/\/v\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * ბაზაში შენახული ბმული (შეიძლება იყოს localhost) → სწორი production URL.
 * ობიექტის გვერდზე iframe-ისთვის და ადმინში ნახვისთვის.
 */
export function resolveTourPublicUrl(storedUrl: string | null | undefined): string {
  const trimmed = (storedUrl || '').trim();
  if (!trimmed) return '';
  const id = extractTourId(trimmed);
  if (id) return getPublishedTourUrl(id);
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
