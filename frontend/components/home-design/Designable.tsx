'use client';

import React from 'react';
import { useHomeDesign } from '@/components/home-design/HomeDesignContext';
import { DesignableBadge } from '@/components/home-design/DesignableBadge';
import {
  railStackHeight,
  type DesignableId,
} from '@/lib/homeDesignLayout';

type DesignableProps = {
  id: Exclude<DesignableId, 'hero' | 'header' | 'theme'>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

const DRAG_THRESHOLD_PX = 3;

/**
 * When Design Mode is on: drag to move, SE handle to resize (W and H independently).
 * History (Ctrl+Z) starts only after real movement — not on mere click/select.
 */
export function Designable({
  id,
  children,
  className = '',
  style,
}: DesignableProps) {
  const {
    designMode,
    layout,
    selectedId,
    setSelectedId,
    setSelectedRailItemId,
    setSelectedTypeItemId,
    updateBox,
    updateServiceRail,
    updateQuickRail,
    beginHistoryGesture,
    endHistoryGesture,
  } = useHomeDesign();

  const box = React.useMemo(() => {
    if (id === 'serviceRail') {
      const { itemW, itemH, gap, items, x, y } = layout.serviceRail;
      return {
        x,
        y,
        w: itemW,
        h: railStackHeight(itemH, gap, items.length),
        itemW,
        itemH,
      };
    }
    if (id === 'quickRail') {
      const { w, itemH, gap, items, x, y } = layout.quickRail;
      return {
        x,
        y,
        w,
        h: railStackHeight(itemH, gap, items.length),
        itemW: w,
        itemH,
      };
    }
    return { ...layout[id], itemW: layout[id].w, itemH: layout[id].h };
  }, [id, layout]);

  const selected = selectedId === id;
  const dragRef = React.useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origItemW: number;
    origItemH: number;
    historyStarted: boolean;
  } | null>(null);

  const applyPatch = React.useCallback(
    (patch: { x?: number; y?: number; itemW?: number; itemH?: number; w?: number; h?: number }) => {
      if (id === 'serviceRail') {
        updateServiceRail({
          ...(patch.x !== undefined ? { x: patch.x } : {}),
          ...(patch.y !== undefined ? { y: patch.y } : {}),
          ...(patch.itemW !== undefined
            ? { itemW: Math.max(40, Math.round(patch.itemW)) }
            : {}),
          ...(patch.itemH !== undefined
            ? { itemH: Math.max(40, Math.round(patch.itemH)) }
            : {}),
        });
        return;
      }
      if (id === 'quickRail') {
        updateQuickRail({
          ...(patch.x !== undefined ? { x: patch.x } : {}),
          ...(patch.y !== undefined ? { y: patch.y } : {}),
          ...(patch.itemW !== undefined || patch.w !== undefined
            ? { w: Math.max(80, Math.round(patch.itemW ?? patch.w ?? 80)) }
            : {}),
          ...(patch.itemH !== undefined
            ? { itemH: Math.max(40, Math.round(patch.itemH)) }
            : {}),
        });
        return;
      }
      updateBox(id, {
        ...(patch.x !== undefined ? { x: patch.x } : {}),
        ...(patch.y !== undefined ? { y: patch.y } : {}),
        ...(patch.w !== undefined
          ? { w: Math.max(id === 'heroText' ? 240 : 40, Math.round(patch.w)) }
          : {}),
        ...(patch.h !== undefined
          ? { h: Math.max(id === 'heroText' ? 72 : 40, Math.round(patch.h)) }
          : {}),
      });
    },
    [id, updateBox, updateQuickRail, updateServiceRail]
  );

  const startDrag = (
    e: React.PointerEvent,
    mode: 'move' | 'resize'
  ) => {
    if (!designMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    setSelectedRailItemId(null);
    setSelectedTypeItemId(null);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / missing pointer id */
    }
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: box.x,
      origY: box.y,
      origItemW: box.itemW,
      origItemH: box.itemH,
      historyStarted: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (!d.historyStarted) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      beginHistoryGesture();
      d.historyStarted = true;
    }

    if (d.mode === 'move') {
      applyPatch({ x: d.origX + dx, y: d.origY + dy });
      return;
    }
    if (id === 'serviceRail' || id === 'quickRail') {
      applyPatch({
        itemW: d.origItemW + dx,
        itemH: d.origItemH + dy,
        w: d.origItemW + dx,
      });
      return;
    }
    applyPatch({ w: d.origItemW + dx, h: d.origItemH + dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const started = dragRef.current.historyStarted;
    dragRef.current = null;
    if (started) endHistoryGesture();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const sizeStyle: React.CSSProperties =
    id === 'serviceRail'
      ? { width: layout.serviceRail.itemW, height: box.h }
      : id === 'quickRail'
        ? { width: layout.quickRail.w, height: box.h }
        : id === 'listings'
          ? {
              width: box.w,
              minHeight: box.h,
              height: 'auto',
              maxWidth: '100%',
              overflow: 'visible' as const,
            }
          : {
              width: box.w,
              height: box.h,
              maxWidth: '100%',
              ...(id === 'typePanel' || id === 'map'
                ? { overflow: 'visible' as const }
                : {}),
            };

  // Leaflet ირღვევა CSS transform-იან მშობელში — ვიყენებთ left/top-ს
  const offsetStyle: React.CSSProperties = {
    position: 'relative',
    left: box.x,
    top: box.y,
  };

  return (
    <div
      className={`group/designable relative ${designMode ? 'z-20' : ''} ${className}`}
      style={{
        ...style,
        ...sizeStyle,
        ...offsetStyle,
        outline: designMode
          ? selected
            ? '2px solid #2563eb'
            : undefined
          : undefined,
        outlineOffset: designMode && selected ? 2 : undefined,
        cursor: designMode ? 'move' : undefined,
        touchAction: designMode ? 'none' : undefined,
      }}
      data-designable={id}
      onClick={
        designMode
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedId(id);
              setSelectedRailItemId(null);
              setSelectedTypeItemId(null);
            }
          : undefined
      }
      onPointerDown={designMode ? (e) => startDrag(e, 'move') : undefined}
      onPointerMove={designMode ? onPointerMove : undefined}
      onPointerUp={designMode ? onPointerUp : undefined}
      onPointerCancel={designMode ? onPointerUp : undefined}
    >
      {designMode && !selected ? (
        <span
          className="pointer-events-none absolute inset-0 rounded opacity-0 ring-1 ring-dashed ring-slate-400/70 transition group-hover/designable:opacity-100"
          aria-hidden
        />
      ) : null}
      {designMode ? <DesignableBadge id={id} selected={selected} /> : null}
      <div
        className={
          designMode
            ? id === 'serviceRail' ||
              id === 'quickRail' ||
              id === 'typePanel' ||
              id === 'listings'
              ? 'h-full w-full'
              : 'pointer-events-none h-full w-full'
            : 'h-full w-full'
        }
      >
        {children}
      </div>

      {designMode && selected ? (
        <div
          className="absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/3 translate-y-1/3 cursor-se-resize rounded-sm bg-blue-600 shadow"
          title="სიგანე და სიმაღლე"
          onPointerDown={(e) => startDrag(e, 'resize')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}
    </div>
  );
}
