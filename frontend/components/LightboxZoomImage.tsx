'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type LightboxZoomImageProps = {
  src: string;
  alt: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_MIN_DISTANCE = 48;

type TouchPoint = { clientX: number; clientY: number };

function touchDistance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchCenter(a: TouchPoint, b: TouchPoint): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function LightboxZoomImage({
  src,
  alt,
  onSwipeLeft,
  onSwipeRight,
}: LightboxZoomImageProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    x: number;
    y: number;
  } | null>(null);
  const panRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyTransform = useCallback((nextScale: number, nextX: number, nextY: number) => {
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    transformRef.current = { scale: s, x: nextX, y: nextY };
    setScale(s);
    setOffset({ x: nextX, y: nextY });
  }, []);

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, zoomIn: boolean) => {
      const container = containerRef.current;
      if (!container) return;

      const zoomFactor = zoomIn ? 1.12 : 1 / 1.12;
      const { scale: s, x, y } = transformRef.current;
      const nextScale = clamp(s * zoomFactor, MIN_SCALE, MAX_SCALE);
      if (Math.abs(nextScale - s) < 0.001) return;

      const rect = container.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      const scaleDelta = nextScale / s;
      const nextX = x - cx * (scaleDelta - 1);
      const nextY = y - cy * (scaleDelta - 1);

      if (nextScale <= 1.05) {
        applyTransform(1, 0, 0);
      } else {
        applyTransform(nextScale, nextX, nextY);
      }
    },
    [applyTransform]
  );

  const resetTransform = useCallback(() => {
    applyTransform(1, 0, 0);
    pinchRef.current = null;
    panRef.current = null;
    swipeRef.current = null;
  }, [applyTransform]);

  useEffect(() => {
    resetTransform();
  }, [src, resetTransform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoomAtPoint(e.clientX, e.clientY, e.deltaY < 0);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = touchDistance(e.touches[0], e.touches[1]);
        const { scale: s, x, y } = transformRef.current;
        pinchRef.current = { distance, scale: s, x, y };
        panRef.current = null;
        swipeRef.current = null;
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const { scale: s } = transformRef.current;

      if (s > 1.02) {
        panRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          originX: transformRef.current.x,
          originY: transformRef.current.y,
        };
        swipeRef.current = null;
      } else {
        swipeRef.current = { x: touch.clientX, y: touch.clientY };
        panRef.current = null;
      }
      pinchRef.current = null;
    },
    []
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const distance = touchDistance(e.touches[0], e.touches[1]);
        const ratio = distance / pinchRef.current.distance;
        const nextScale = clamp(pinchRef.current.scale * ratio, MIN_SCALE, MAX_SCALE);
        const center = touchCenter(e.touches[0], e.touches[1]);
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = center.x - rect.left - rect.width / 2;
        const cy = center.y - rect.top - rect.height / 2;
        const scaleDelta = nextScale / pinchRef.current.scale;
        const nextX = pinchRef.current.x - cx * (scaleDelta - 1);
        const nextY = pinchRef.current.y - cy * (scaleDelta - 1);
        applyTransform(nextScale, nextX, nextY);
        return;
      }

      if (e.touches.length === 1 && panRef.current) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - panRef.current.x;
        const dy = touch.clientY - panRef.current.y;
        applyTransform(
          transformRef.current.scale,
          panRef.current.originX + dx,
          panRef.current.originY + dy
        );
      }
    },
    [applyTransform]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) return;

      const { scale: s } = transformRef.current;
      if (s <= 1.05) {
        applyTransform(1, 0, 0);
      }

      if (s <= 1.02 && swipeRef.current) {
        const touch = e.changedTouches[0];
        if (!touch) {
          swipeRef.current = null;
          return;
        }
        const dx = touch.clientX - swipeRef.current.x;
        const dy = touch.clientY - swipeRef.current.y;
        if (Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) onSwipeLeft?.();
          else onSwipeRight?.();
        }
      }

      pinchRef.current = null;
      panRef.current = null;
      swipeRef.current = null;
    },
    [applyTransform, onSwipeLeft, onSwipeRight]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const { scale: s } = transformRef.current;
      if (s > 1.05) {
        resetTransform();
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      applyTransform(2, -cx * 0.5, -cy * 0.5);
    },
    [applyTransform, resetTransform]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || transformRef.current.scale <= 1.02) return;
    e.preventDefault();
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
    };
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panRef.current) return;
      e.preventDefault();
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      applyTransform(
        transformRef.current.scale,
        panRef.current.originX + dx,
        panRef.current.originY + dy
      );
    },
    [applyTransform]
  );

  const endMousePan = useCallback(() => {
    panRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full touch-none items-center justify-center overflow-hidden ${
        scale > 1.02 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
      }`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endMousePan}
      onMouseLeave={endMousePan}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-full w-full select-none object-contain transition-transform duration-75 md:w-auto md:max-w-full"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
}
