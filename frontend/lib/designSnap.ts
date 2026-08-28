/** Screen-space snap for Design Mode (Figma-style edge/center guides). */

export const DESIGN_SNAP_THRESHOLD_PX = 7;

export type SnapGuide = {
  /** `v` = vertical line at x, `h` = horizontal line at y */
  axis: 'v' | 'h';
  pos: number;
};

export type SnapRect = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
};

type SnapExclude = {
  designable?: string;
  headerItem?: string;
  chip?: string;
  typeCard?: string;
  railLabel?: string;
  railItem?: string;
};

function uniqGuides(guides: SnapGuide[]): SnapGuide[] {
  const seen = new Set<string>();
  const out: SnapGuide[] = [];
  for (const g of guides) {
    const key = `${g.axis}:${Math.round(g.pos)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ axis: g.axis, pos: Math.round(g.pos) });
  }
  return out;
}

export function rectFromDom(el: Element, id: string): SnapRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    id,
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  };
}

export function rectFromValues(
  id: string,
  left: number,
  top: number,
  width: number,
  height: number
): SnapRect {
  return {
    id,
    left,
    top,
    right: left + width,
    bottom: top + height,
    cx: left + width / 2,
    cy: top + height / 2,
  };
}

export function offsetRect(r: SnapRect, dx: number, dy: number): SnapRect {
  return {
    ...r,
    left: r.left + dx,
    right: r.right + dx,
    top: r.top + dy,
    bottom: r.bottom + dy,
    cx: r.cx + dx,
    cy: r.cy + dy,
  };
}

function xLines(r: SnapRect): number[] {
  return [r.cx, r.left, r.right];
}

function yLines(r: SnapRect): number[] {
  return [r.cy, r.top, r.bottom];
}

function bestDelta(movingLines: number[], targetLines: number[], threshold: number): number | null {
  let best = 0;
  let bestAbs = threshold + 1;
  for (const m of movingLines) {
    for (const t of targetLines) {
      const d = t - m;
      const ad = Math.abs(d);
      if (ad <= threshold && ad < bestAbs) {
        bestAbs = ad;
        best = d;
      }
    }
  }
  return bestAbs <= threshold ? best : null;
}

function guidesForAxis(
  axis: 'v' | 'h',
  movingLines: number[],
  targets: SnapRect[],
  targetLines: (r: SnapRect) => number[],
  eps: number
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  for (const t of targets) {
    for (const m of movingLines) {
      for (const p of targetLines(t)) {
        if (Math.abs(m - p) <= eps) guides.push({ axis, pos: p });
      }
    }
  }
  return guides;
}

/**
 * Snap a moving rect to other rects' edges and centers.
 * Returns extra dx/dy to apply on top of the proposed move, plus guide lines.
 */
export function snapRectToTargets(
  moving: SnapRect,
  targets: SnapRect[],
  threshold = DESIGN_SNAP_THRESHOLD_PX
): { dx: number; dy: number; guides: SnapGuide[] } {
  if (!targets.length) return { dx: 0, dy: 0, guides: [] };
  const dx = bestDelta(xLines(moving), targets.flatMap(xLines), threshold) ?? 0;
  const dy = bestDelta(yLines(moving), targets.flatMap(yLines), threshold) ?? 0;
  const snapped = offsetRect(moving, dx, dy);
  const guides = uniqGuides([
    ...guidesForAxis('v', xLines(snapped), targets, xLines, 0.75),
    ...guidesForAxis('h', yLines(snapped), targets, yLines, 0.75),
  ]);
  return { dx, dy, guides };
}

/** Snap a point (center-anchored labels) to target edges/centers. */
export function snapPointToTargets(
  x: number,
  y: number,
  targets: SnapRect[],
  threshold = DESIGN_SNAP_THRESHOLD_PX
): { x: number; y: number; guides: SnapGuide[] } {
  const moving = rectFromValues('pt', x, y, 0, 0);
  const { dx, dy, guides } = snapRectToTargets(moving, targets, threshold);
  return { x: x + dx, y: y + dy, guides };
}

export function collectSnapRects(
  selector: string,
  idFromEl: (el: HTMLElement) => string | null,
  excludeId?: string
): SnapRect[] {
  const out: SnapRect[] = [];
  if (typeof document === 'undefined') return out;
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const id = idFromEl(el);
    if (!id || id === excludeId) return;
    const rect = rectFromDom(el, id);
    if (rect) out.push(rect);
  });
  return out;
}

export function collectDesignSnapTargets(
  mode: 'blocks' | 'header' | 'chips' | 'rails',
  exclude?: SnapExclude
): SnapRect[] {
  const targets: SnapRect[] = [];

  if (mode === 'blocks' || mode === 'header') {
    targets.push(
      ...collectSnapRects(
        '[data-designable]',
        (el) => el.getAttribute('data-designable'),
        exclude?.designable
      )
    );
    const center = document.querySelector('[data-design-center]');
    if (center) {
      const rect = rectFromDom(center, 'center-col');
      if (rect) targets.push(rect);
    }
    const headerBar = document.querySelector('[data-header-canvas]');
    if (headerBar) {
      const rect = rectFromDom(headerBar, 'header-bar');
      if (rect) targets.push(rect);
    }
  }

  if (mode === 'header') {
    targets.push(
      ...collectSnapRects(
        '[data-header-item]',
        (el) => el.getAttribute('data-header-item'),
        exclude?.headerItem
      )
    );
  }

  if (mode === 'chips') {
    targets.push(
      ...collectSnapRects(
        '[data-design-chip]',
        (el) => el.getAttribute('data-design-chip'),
        exclude?.chip
      )
    );
    const cardId = exclude?.typeCard;
    if (cardId) {
      const card = document.querySelector(`[data-type-item="${CSS.escape(cardId)}"]`);
      if (card) {
        const rect = rectFromDom(card, `card:${cardId}`);
        if (rect) targets.push(rect);
      }
    }
  }

  if (mode === 'rails') {
    targets.push(
      ...collectSnapRects(
        '[data-design-rail-label]',
        (el) => el.getAttribute('data-design-rail-label'),
        exclude?.railLabel
      )
    );
    const railId = exclude?.railItem;
    if (railId) {
      const item = document.querySelector(`[data-rail-item="${CSS.escape(railId)}"]`);
      if (item) {
        const rect = rectFromDom(item, `rail:${railId}`);
        if (rect) targets.push(rect);
      }
    }
  }

  return targets;
}

type GuideListener = (guides: SnapGuide[]) => void;

let currentGuides: SnapGuide[] = [];
const guideListeners = new Set<GuideListener>();

export function setDesignSnapGuides(guides: SnapGuide[]) {
  currentGuides = guides;
  guideListeners.forEach((fn) => fn(guides));
}

export function clearDesignSnapGuides() {
  if (currentGuides.length === 0) return;
  setDesignSnapGuides([]);
}

export function getDesignSnapGuides(): SnapGuide[] {
  return currentGuides;
}

export function subscribeDesignSnapGuides(fn: GuideListener): () => void {
  guideListeners.add(fn);
  return () => {
    guideListeners.delete(fn);
  };
}
