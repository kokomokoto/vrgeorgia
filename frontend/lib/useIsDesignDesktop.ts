'use client';

import React from 'react';

/** Tailwind `md` = 768px — desktop chrome (vs phone accordion / hamburger) */
export const DESIGN_DESKTOP_MIN_WIDTH = 768;

/** Tailwind `xl` = 1280px — full nav / side rails */
export const DESIGN_WIDE_MIN_WIDTH = 1280;

function useMinWidthMatch(minWidth: number): boolean {
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [minWidth]);

  return ok;
}

/**
 * true when viewport is md+.
 * SSR/first paint defaults to false — do NOT use this to choose public layout
 * (hero/search/type panel). Those must use CSS `md:` / `max-md:` so the first
 * HTML paint matches the loaded desktop design. This hook is for design-mode
 * pointer handlers after hydration.
 */
export function useIsDesignDesktop(): boolean {
  return useMinWidthMatch(DESIGN_DESKTOP_MIN_WIDTH);
}

/**
 * true when viewport is xl+ (full free/classic nav, side rails).
 */
export function useIsDesignWide(): boolean {
  return useMinWidthMatch(DESIGN_WIDE_MIN_WIDTH);
}

/**
 * Uniform shrink factor for designed px sizes when the window is narrower than
 * the design canvas. Everything that uses this scale moves together — no mix of
 * fixed and fluid pieces. Below md, returns 1 (separate mobile layout).
 */
export function useHomeDesignScale(designWidth: number): number {
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const vw = window.visualViewport?.width || window.innerWidth;
      if (vw < DESIGN_DESKTOP_MIN_WIDTH) {
        setScale(1);
        return;
      }
      const canvas = Math.max(640, designWidth || 1280);
      // page horizontal padding (~24–32px)
      const usable = Math.max(320, vw - 32);
      setScale(Math.min(1, usable / canvas));
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [designWidth]);

  return scale;
}

/** Scale a designed px value; keeps integers stable for layout. */
export function scaleDesignPx(px: number, scale: number, min = 0): number {
  if (!Number.isFinite(px)) return min;
  if (!Number.isFinite(scale) || scale >= 0.999) return Math.max(min, px);
  return Math.max(min, Math.round(px * scale));
}

/** Scale designed left/top offsets (negative values must stay negative). */
export function scaleDesignOffset(px: number, scale: number): number {
  if (!Number.isFinite(px)) return 0;
  if (!Number.isFinite(scale) || scale >= 0.999) return Math.round(px);
  return Math.round(px * scale);
}
