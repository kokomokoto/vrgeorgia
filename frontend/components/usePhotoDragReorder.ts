'use client';

import { useCallback, useRef, useState } from 'react';

export type DropPlacement = 'before' | 'after';

export function usePhotoDragReorder(
  onReorder: (fromIndex: number, targetIndex: number, placement: DropPlacement) => void
) {
  const dragFromRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPlacement, setDropPlacement] = useState<DropPlacement>('after');

  const onDragEnd = useCallback(() => {
    dragFromRef.current = null;
    setDragOverIndex(null);
    setDropPlacement('after');
  }, []);

  const getThumbDragProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        dragFromRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        setDropPlacement(x < rect.width / 2 ? 'before' : 'after');
      },
      onDragLeave: () => {
        setDragOverIndex((prev) => {
          if (prev !== index) return prev;
          setDropPlacement('after');
          return null;
        });
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const from = dragFromRef.current;
        if (from !== null && from !== index) onReorder(from, index, dropPlacement);
        onDragEnd();
      },
      onDragEnd,
    }),
    [dropPlacement, onDragEnd, onReorder]
  );

  const isInsertBefore = (index: number) =>
    dragOverIndex === index && dropPlacement === 'before';
  const isInsertAfter = (index: number) =>
    dragOverIndex === index && dropPlacement === 'after';

  const getNudgeClass = (index: number) => {
    if (dragOverIndex === null) return '';
    const beforeIndex = dropPlacement === 'before' ? dragOverIndex - 1 : dragOverIndex;
    const afterIndex = dropPlacement === 'before' ? dragOverIndex : dragOverIndex + 1;
    if (index === beforeIndex) return '-translate-x-1.5';
    if (index === afterIndex) return 'translate-x-1.5';
    return '';
  };

  return { getThumbDragProps, isInsertBefore, isInsertAfter, getNudgeClass };
}
