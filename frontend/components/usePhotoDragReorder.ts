'use client';

import { useCallback, useRef, useState } from 'react';

import { resolveDropToIndex, type DropPlacement } from '@/lib/propertyPhotos';

function isExternalFileDrag(e: React.DragEvent) {
  return Array.from(e.dataTransfer.types).includes('Files');
}

function hitPhotoIndex(clientX: number, clientY: number, source: HTMLElement | null): number | null {
  if (source) source.style.pointerEvents = 'none';
  const hit = document.elementFromPoint(clientX, clientY);
  if (source) source.style.pointerEvents = '';
  const card = hit?.closest('[data-photo-index]');
  if (!card) return null;
  const index = Number(card.getAttribute('data-photo-index'));
  return Number.isNaN(index) ? null : index;
}

/** drag-ის დროს ცოცხალი გადალაგება — ხელის გაშვებამდე ფოტო უკვე იკავებს ადგილს */
export function usePhotoDragReorder(onLiveReorder: (fromIndex: number, toIndex: number) => void) {
  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const touchPointerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const finishDrag = useCallback(() => {
    dragIndexRef.current = null;
    touchPointerRef.current = null;
    setDraggingIndex(null);
  }, []);

  const moveLive = useCallback(
    (from: number, overIndex: number, clientX: number, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const placement: DropPlacement = clientX - rect.left < rect.width / 2 ? 'before' : 'after';
      const to = resolveDropToIndex(from, overIndex, placement);
      if (to === from) return;
      onLiveReorder(from, to);
      dragIndexRef.current = to;
      setDraggingIndex(to);
    },
    [onLiveReorder]
  );

  const wasPhotoDrag = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const getThumbDragProps = useCallback(
    (index: number) => ({
      draggable: true,
      'data-photo-index': index,
      onDragStart: (e: React.DragEvent) => {
        if (isExternalFileDrag(e)) return;
        if (touchPointerRef.current !== null) {
          e.preventDefault();
          return;
        }
        dragIndexRef.current = index;
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      },
      onDragOver: (e: React.DragEvent) => {
        if (dragIndexRef.current === null && isExternalFileDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const from = dragIndexRef.current;
        if (from === null) return;
        moveLive(from, index, e.clientX, e.currentTarget as HTMLElement);
      },
      onDrop: (e: React.DragEvent) => {
        if (dragIndexRef.current === null && isExternalFileDrag(e)) {
          finishDrag();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = true;
        finishDrag();
      },
      onDragEnd: finishDrag,
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') return;
        const handle = (e.target as HTMLElement).closest('[data-photo-drag-handle]');
        if (!handle) return;
        e.preventDefault();
        e.stopPropagation();
        touchPointerRef.current = e.pointerId;
        dragIndexRef.current = index;
        setDraggingIndex(index);
        const card = e.currentTarget as HTMLElement;
        try {
          card.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic or already-released pointer */
        }
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (touchPointerRef.current !== e.pointerId) return;
        const from = dragIndexRef.current;
        if (from === null) return;
        e.preventDefault();
        suppressClickRef.current = true;
        const over = hitPhotoIndex(e.clientX, e.clientY, e.currentTarget as HTMLElement);
        if (over === null || over === from) return;
        const card = document.querySelector(`[data-photo-index="${over}"]`);
        if (!(card instanceof HTMLElement)) return;
        moveLive(from, over, e.clientX, card);
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (touchPointerRef.current !== e.pointerId) return;
        finishDrag();
        if (suppressClickRef.current) {
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 400);
        }
      },
      onPointerCancel: (e: React.PointerEvent) => {
        if (touchPointerRef.current !== e.pointerId) return;
        finishDrag();
      },
    }),
    [finishDrag, moveLive]
  );

  const isDragging = (index: number) => draggingIndex === index;

  return { getThumbDragProps, isDragging, draggingIndex, wasPhotoDrag };
}
