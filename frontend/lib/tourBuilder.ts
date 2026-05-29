/** tour-builder აპის მისამართი (ლოკალურად ჩვეულებრივ :3002) */
export function getTourBuilderOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TOUR_BUILDER_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3002`;
  }
  return 'http://localhost:3002';
}

/** ახალი ტაბში იხსნება — ტური იქმნება და რედაქტორში გადადის */
export function getTourBuilderEmbedUrl(): string {
  return `${getTourBuilderOrigin()}/?from=vrgeorgia`;
}

export const VRGEORGIA_TOUR_STORAGE_KEY = 'vrgeorgia_pending_tour_link';

export function getPublishedTourUrl(tourId: string): string {
  return `${getTourBuilderOrigin()}/v/${tourId}`;
}

/** გამოქვეყნებული ბმულიდან (/v/{id}) ამოაქვს tourId */
export function extractTourId(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const match = publicUrl.match(/\/v\/([^/?#]+)/);
  return match ? match[1] : null;
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

export function isTourPublishedMessage(data: unknown): data is VrGeorgiaTourPublishedMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as VrGeorgiaTourPublishedMessage).type === VRGEORGIA_TOUR_MESSAGE &&
    typeof (data as VrGeorgiaTourPublishedMessage).url === 'string'
  );
}
