'use client';

import { useCallback, useRef, useState } from 'react';

import { resolveDropToIndex, type DropPlacement } from '@/lib/propertyPhotos';

/** drag-ის დროს ცოცხალი გადალაგება — ხელის გაშვებამდე ფოტო უკვე იკავებს ადგილს */
export function usePhotoDragReorder(onLiveReorder: (fromIndex: number, toIndex: number) => void) {
  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const onDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
  }, []);

  const getThumbDragProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        dragIndexRef.current = index;
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const from = dragIndexRef.current;
        if (from === null) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const placement: DropPlacement =
          e.clientX - rect.left < rect.width / 2 ? 'before' : 'after';
        const to = resolveDropToIndex(from, index, placement);

        if (to !== from) {
          onLiveReorder(from, to);
          dragIndexRef.current = to;
          setDraggingIndex(to);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnd();
      },
      onDragEnd,
    }),
    [onDragEnd, onLiveReorder]
  );

  const isDragging = (index: number) => draggingIndex === index;

  return { getThumbDragProps, isDragging, draggingIndex };
}
