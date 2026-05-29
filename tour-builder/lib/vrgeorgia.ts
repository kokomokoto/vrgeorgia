export const VRGEORGIA_TOUR_MESSAGE = "VRGEORGIA_TOUR_PUBLISHED";
export const VRGEORGIA_TOUR_STORAGE_KEY = "vrgeorgia_pending_tour_link";

const DEFAULT_PUBLIC_BASE = "https://vrgeorgia-api.onrender.com";

/**
 * საჯარო ტურის URL VR Georgia-ში შესანახად.
 * embed რეჟიმში ყოველთვის production მისამართია — არა localhost.
 */
export function getPublicTourUrl(tourId: string, embedMode = false): string {
  const configured =
    process.env.NEXT_PUBLIC_TOUR_BUILDER_PUBLIC_URL?.trim() ||
    process.env.TOUR_BUILDER_PUBLIC_URL?.trim();

  if (embedMode) {
    const base = configured || DEFAULT_PUBLIC_BASE;
    return `${base.replace(/\/$/, "")}/v/${tourId}`;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.origin}/v/${tourId}`;
    }
  }

  const base = configured || DEFAULT_PUBLIC_BASE;
  return `${base.replace(/\/$/, "")}/v/${tourId}`;
}
