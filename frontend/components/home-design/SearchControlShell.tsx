'use client';

import React from 'react';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  type SearchControlId,
  SEARCH_CONTROL_LABELS,
  resolveSearchControl,
  clampOpacity,
} from '@/lib/homeDesignLayout';
import { scaleDesignPx, useHomeDesignScale, useIsDesignDesktop } from '@/lib/useIsDesignDesktop';

const DRAG_THRESHOLD_PX = 3;

type SearchControlShellProps = {
  id: SearchControlId;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Design Mode wrapper for one search-row control (ფასი…ძიების ღილაკი).
 * Click to select; SE handle resizes W/H independently.
 */
export function SearchControlShell({
  id,
  children,
  className = '',
  style,
}: SearchControlShellProps) {
  const design = useHomeDesignOptional();
  const isDesktop = useIsDesignDesktop();
  const designMode = design?.designMode ?? false;
  const selected =
    designMode &&
    design?.selectedId === 'search' &&
    design?.selectedSearchControlId === id;
  const search = design?.layout.search;
  const canvasW = Math.max(search?.w ?? 0, 1280);
  const designScale = useHomeDesignScale(canvasW);
  const box = resolveSearchControl(search, id);
  const w = scaleDesignPx(box.w, designScale, 56);
  const h = scaleDesignPx(box.h, designScale, 28);

  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
    historyStarted: boolean;
  } | null>(null);

  const canEdit = designMode && isDesktop;

  const select = (e: React.MouseEvent | React.PointerEvent) => {
    if (!canEdit || !design) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('search');
    design.setSelectedSearchControlId(id);
    design.setSelectedTypeItemId(null);
    design.setSelectedRailItemId(null);
    design.setSelectedHeaderItemId(null);
    design.setSelectedDealChipId(null);
  };

  const onResizeDown = (e: React.PointerEvent) => {
    if (!canEdit || !design) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('search');
    design.setSelectedSearchControlId(id);
    design.setActiveEditParams(['w', 'h']);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: box.w,
      origH: box.h,
      historyStarted: false,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !design) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.historyStarted) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      design.beginHistoryGesture();
      d.historyStarted = true;
    }
    const inv = designScale > 0.001 ? 1 / designScale : 1;
    design.updateSearchControl(id, {
      w: Math.round(d.origW + dx * inv),
      h: Math.round(d.origH + dy * inv),
    });
  };

  const onResizeUp = () => {
    if (!design || !dragRef.current) return;
    const started = dragRef.current.historyStarted;
    dragRef.current = null;
    design.setActiveEditParams([]);
    if (started) design.endHistoryGesture();
  };

  return (
    <div
      className={`relative max-md:!h-auto max-md:!w-full max-md:!min-w-0 max-md:!max-w-full max-md:!flex-auto max-md:overflow-hidden ${className}`}
      data-search-control={id}
      title={canEdit ? SEARCH_CONTROL_LABELS[id] : undefined}
      style={
        {
          ...style,
          width: w,
          minWidth: w,
          height: h,
          flex: `0 0 ${w}px`,
          maxWidth: 'none',
          outline: canEdit
            ? selected
              ? '2px solid #2563eb'
              : '1px dashed #94a3b8'
            : undefined,
          outlineOffset: canEdit ? -1 : undefined,
          cursor: canEdit ? 'pointer' : undefined,
        } as React.CSSProperties
      }
      onClick={canEdit ? select : undefined}
      onPointerDown={
        canEdit
          ? (e) => {
              // Don't start parent Designable drag when interacting with a control
              e.stopPropagation();
            }
          : undefined
      }
    >
      <div
        className={
          canEdit
            ? 'pointer-events-none h-full w-full min-w-0 max-md:overflow-hidden'
            : 'h-full w-full min-w-0 max-md:overflow-hidden'
        }
        style={{
          height: '100%',
          opacity: clampOpacity(box.opacity),
        }}
      >
        {children}
      </div>
      {canEdit && selected ? (
        <div
          className="pointer-events-auto absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/3 translate-y-1/3 cursor-se-resize rounded-sm bg-blue-600 shadow"
          title={`${SEARCH_CONTROL_LABELS[id]} — სიგანე და სიმაღლე`}
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
        />
      ) : null}
    </div>
  );
}
