'use client';

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

import { animateFlip, captureFlipPositions } from '@/lib/flipAnimation';

type PhotoSortableGridProps = {
  className?: string;
  children: ReactNode;
  /** reorder-ის შემდეგ ანიმაციის ტრიგერი (მაგ. photos.length + პირველი key) */
  layoutKey: string;
  gridRef?: RefObject<HTMLDivElement | null>;
  pendingFlipRef?: RefObject<Map<string, DOMRect> | null>;
  draggingFlipKey?: string | null;
};

export function PhotoSortableGrid({
  className,
  children,
  layoutKey,
  gridRef: externalGridRef,
  pendingFlipRef: externalPendingFlipRef,
  draggingFlipKey = null,
}: PhotoSortableGridProps) {
  const internalGridRef = useRef<HTMLDivElement>(null);
  const internalPendingFlipRef = useRef<Map<string, DOMRect> | null>(null);

  const gridRef = externalGridRef ?? internalGridRef;
  const pendingFlipRef = externalPendingFlipRef ?? internalPendingFlipRef;

  useLayoutEffect(() => {
    const el = gridRef.current;
    const first = pendingFlipRef.current;
    if (!el || !first?.size) return;
    animateFlip(el, first, { skipKey: draggingFlipKey ?? undefined });
    pendingFlipRef.current = null;
  }, [layoutKey, gridRef, pendingFlipRef, draggingFlipKey]);

  return (
    <div ref={gridRef} className={className}>
      {children}
    </div>
  );
}

/** reorder-ის წინ გამოიძახე — FLIP-ის „First“ ფაზა */
export function snapshotPhotoGridFlip(gridEl: HTMLElement | null): Map<string, DOMRect> | null {
  if (!gridEl) return null;
  return captureFlipPositions(gridEl);
}
