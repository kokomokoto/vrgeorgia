'use client';

import React from 'react';

/** Tailwind `md` = 768px — Design Mode desktop canvas threshold */
export const DESIGN_DESKTOP_MIN_WIDTH = 768;

/**
 * true when viewport is md+. SSR/first paint defaults to false (mobile-safe:
 * no fixed 1280px design widths on phones before hydration).
 */
export function useIsDesignDesktop(): boolean {
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(min-width: ${DESIGN_DESKTOP_MIN_WIDTH}px)`);
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return ok;
}
