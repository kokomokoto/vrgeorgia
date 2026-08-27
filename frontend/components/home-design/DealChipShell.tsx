'use client';

import React from 'react';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  type DealChipId,
  DEAL_CHIP_LABELS,
  DEFAULT_DEAL_CHIPS,
  normalizeDealChip,
  clampOpacity,
} from '@/lib/homeDesignLayout';
import { scaleDesignPx, useHomeDesignScale, useIsDesignDesktop } from '@/lib/useIsDesignDesktop';

const DRAG_THRESHOLD_PX = 3;

type DealChipShellProps = {
  id: DealChipId;
  children: React.ReactNode;
  className?: string;
};

/** Design Mode wrapper for one deal chip (იყიდება / ქირავდება / გირავდება). */
export function DealChipShell({ id, children, className = '' }: DealChipShellProps) {
  const design = useHomeDesignOptional();
  const isDesktop = useIsDesignDesktop();
  const designMode = design?.designMode ?? false;
  const selected =
    designMode &&
    design?.selectedId === 'dealBar' &&
    design?.selectedDealChipId === id;
  const deal = design?.layout.dealBar;
  const canvasW = Math.max(deal?.w ?? 0, design?.layout.search?.w ?? 0, 1280);
  const designScale = useHomeDesignScale(canvasW);
  const box = normalizeDealChip(deal?.chips?.[id], DEFAULT_DEAL_CHIPS[id]);
  const w = scaleDesignPx(box.w, designScale, 72);
  const h = scaleDesignPx(box.h, designScale, 28);

  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
    historyStarted: boolean;
  } | null>(null);

  const canEdit = designMode && isDesktop;

  const select = (e: React.MouseEvent) => {
    if (!canEdit || !design) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('dealBar');
    design.setSelectedDealChipId(id);
    design.setSelectedSearchControlId(null);
    design.setSelectedTypeItemId(null);
    design.setSelectedRailItemId(null);
    design.setSelectedHeaderItemId(null);
  };

  const onResizeDown = (e: React.PointerEvent) => {
    if (!canEdit || !design) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('dealBar');
    design.setSelectedDealChipId(id);
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
    design.updateDealChip(id, {
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
      className={`relative max-md:min-w-0 max-md:flex-1 md:h-[var(--dc-h)] md:w-[var(--dc-w)] md:min-w-[var(--dc-w)] md:flex-[0_0_var(--dc-w)] ${className}`}
      data-deal-chip={id}
      title={canEdit ? DEAL_CHIP_LABELS[id] : undefined}
      style={
        {
          '--dc-w': `${w}px`,
          '--dc-h': `${h}px`,
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
      onPointerDown={canEdit ? (e) => e.stopPropagation() : undefined}
    >
      <div
        className={canEdit ? 'pointer-events-none h-full w-full' : 'h-full w-full'}
        style={{ opacity: clampOpacity(box.opacity) }}
      >
        {children}
      </div>
      {canEdit && selected ? (
        <div
          className="pointer-events-auto absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/3 translate-y-1/3 cursor-se-resize rounded-sm bg-blue-600 shadow"
          title={`${DEAL_CHIP_LABELS[id]} — სიგანე და სიმაღლე`}
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
        />
      ) : null}
    </div>
  );
}
