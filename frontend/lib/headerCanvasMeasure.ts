import {
  HEADER_ITEM_GAP_PX_DEFAULT,
  HEADER_ITEM_IDS,
  clampHeaderItemGapPx,
  headerItemPadPxById,
  type HeaderItemId,
  type HeaderItemPos,
  type HeaderItemSizePct,
  type HeaderLayout,
  type HeaderOverlapOpts,
} from '@/lib/homeDesignLayout';

/** Design-mode ring is box-shadow (not in the rect) — keep collision with the visible outline. */
const HEADER_ITEM_RING_PX = 4;

export function queryHeaderCanvas(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('[data-header-canvas]');
}

export function measureHeaderItemSizes(
  host: HTMLElement,
  box: DOMRect
): Partial<Record<HeaderItemId, HeaderItemSizePct>> {
  const sizes: Partial<Record<HeaderItemId, HeaderItemSizePct>> = {};
  if (box.width <= 0 || box.height <= 0) return sizes;
  host.querySelectorAll<HTMLElement>('[data-header-item]').forEach((el) => {
    const id = el.getAttribute('data-header-item') as HeaderItemId | null;
    if (!id || !HEADER_ITEM_IDS.includes(id)) return;
    const r = el.getBoundingClientRect();
    sizes[id] = {
      wPct: ((r.width + HEADER_ITEM_RING_PX) / box.width) * 100,
      hPct: ((r.height + HEADER_ITEM_RING_PX) / box.height) * 100,
    };
  });
  return sizes;
}

export function captureHeaderItemPositions(
  host: HTMLElement,
  box: DOMRect
): Partial<Record<HeaderItemId, HeaderItemPos>> {
  const out: Partial<Record<HeaderItemId, HeaderItemPos>> = {};
  if (box.width <= 0 || box.height <= 0) return out;
  host.querySelectorAll<HTMLElement>('[data-header-item]').forEach((el) => {
    const id = el.getAttribute('data-header-item') as HeaderItemId | null;
    if (!id || !HEADER_ITEM_IDS.includes(id)) return;
    const r = el.getBoundingClientRect();
    out[id] = {
      x: ((r.left + r.width / 2 - box.left) / box.width) * 100,
      y: ((r.top + r.height / 2 - box.top) / box.height) * 100,
    };
  });
  return out;
}

export function seedVisibleHeaderPositions(
  prev: Partial<Record<HeaderItemId, HeaderItemPos>> | undefined,
  host?: HTMLElement | null
): Partial<Record<HeaderItemId, HeaderItemPos>> {
  const canvas = host || queryHeaderCanvas();
  const seeded: Partial<Record<HeaderItemId, HeaderItemPos>> = { ...(prev || {}) };
  if (!canvas) return seeded;
  const box = canvas.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return seeded;
  const captured = captureHeaderItemPositions(canvas, box);
  for (const id of HEADER_ITEM_IDS) {
    if (!captured[id]) continue;
    if (!seeded[id]) seeded[id] = captured[id];
  }
  return seeded;
}

export function liveHeaderOverlapOpts(
  header: HeaderLayout | undefined,
  axisLock?: 'x' | 'y' | null
): HeaderOverlapOpts | null {
  const host = queryHeaderCanvas();
  if (!host) return null;
  const box = host.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  const sizes = measureHeaderItemSizes(host, box);
  return {
    sizes,
    visibleIds: HEADER_ITEM_IDS.filter((id) => Boolean(sizes[id])),
    gapPx: clampHeaderItemGapPx(header?.itemGapPx, HEADER_ITEM_GAP_PX_DEFAULT),
    padPxById: headerItemPadPxById(header?.itemStyles),
    barW: box.width,
    barH: box.height,
    axisLock: axisLock ?? null,
  };
}

export function fallbackHeaderOverlapOpts(
  header: HeaderLayout | undefined,
  axisLock?: 'x' | 'y' | null
): HeaderOverlapOpts {
  const positions = header?.itemPositions;
  return {
    visibleIds: HEADER_ITEM_IDS.filter(
      (id) => id !== 'messages' && Boolean(positions?.[id])
    ),
    gapPx: clampHeaderItemGapPx(header?.itemGapPx, HEADER_ITEM_GAP_PX_DEFAULT),
    padPxById: headerItemPadPxById(header?.itemStyles),
    barW: 1280,
    barH: header?.h ?? 60,
    axisLock: axisLock ?? null,
  };
}

export function headerOverlapOptsForEditor(
  header: HeaderLayout | undefined,
  axisLock?: 'x' | 'y' | null
): HeaderOverlapOpts {
  return liveHeaderOverlapOpts(header, axisLock) || fallbackHeaderOverlapOpts(header, axisLock);
}
