'use client';

import { useCallback, useRef } from 'react';

type HorizontalSwipeOptions = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDistance?: number;
};

/** მობილური — თითის ჰორიზონტალური swipe ფოტოების გადართვისთვის */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 48,
}: HorizontalSwipeOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startRef.current = { x: touch.clientX, y: touch.clientY };
    swipedRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      swipedRef.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) {
        startRef.current = null;
        return;
      }
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
      swipedRef.current = true;
    },
    [minDistance, onSwipeLeft, onSwipeRight]
  );

  const consumeSwipe = useCallback(() => {
    if (!swipedRef.current) return false;
    swipedRef.current = false;
    return true;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    consumeSwipe,
  };
}
