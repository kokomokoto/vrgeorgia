'use client';

import React from 'react';
import { useHomeDesign } from '@/components/home-design/HomeDesignContext';
import { DesignableBadge } from '@/components/home-design/DesignableBadge';
import {
  railStackHeight,
  clampOpacity,
  type DesignableId,
} from '@/lib/homeDesignLayout';
import { scaleDesignPx, scaleDesignOffset, useHomeDesignScale, useIsDesignDesktop } from '@/lib/useIsDesignDesktop';
import { HERO_W } from '@/components/home-design/HeroSlideshow';
import {
  clearDesignSnapGuides,
  collectDesignSnapTargets,
  offsetRect,
  rectFromDom,
  setDesignSnapGuides,
  snapRectToTargets,
  type SnapRect,
} from '@/lib/designSnap';

type DesignableProps = {
  id: Exclude<DesignableId, 'hero' | 'header' | 'theme' | 'social'>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

const DRAG_THRESHOLD_PX = 3;

/** Phone absolute nudge — title on the photo band. */
const MOBILE_ABS_NUDGE_IDS = new Set<DesignableId>(['heroText']);

/**
 * Phone stack nudge — vertical spacing via margin (not relative top),
 * so dragging closer does not leave an empty hole in the flex flow.
 */
const MOBILE_STACK_NUDGE_IDS = new Set<DesignableId>([
  'dealBar',
  'search',
  'typePanel',
  'map',
]);

/**
 * When Design Mode is on: drag to move, SE handle to resize (W and H independently).
 * History (Ctrl+Z) starts only after real movement — not on mere click/select.
 * Below md: most geometry stays fluid; selected blocks still nudge via mobileX/Y.
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
    setActiveEditParams,
    updateBox,
    updateServiceRail,
    updateQuickRail,
    updateHeroText,
    beginHistoryGesture,
    endHistoryGesture,
  } = useHomeDesign();
  const isDesktop = useIsDesignDesktop();
  const designCanvasW = Math.max(
    layout.map?.w ?? 0,
    layout.typePanel?.w ?? 0,
    layout.listings?.w ?? 0,
    layout.search?.w ?? 0,
    1280
  );
  const designScale = useHomeDesignScale(designCanvasW);
  const heroOffsetScale = useHomeDesignScale(HERO_W);
  /** Desktop canvas: offsets + max widths. Heights stay auto/scaled so shrink is uniform. */
  const applyGeometry = isDesktop;
  const canSelectDesign = designMode;
  const canNudgeMobile =
    designMode &&
    !isDesktop &&
    (MOBILE_ABS_NUDGE_IDS.has(id) || MOBILE_STACK_NUDGE_IDS.has(id));
  const canMoveDesign = (designMode && applyGeometry) || canNudgeMobile;
  /**
   * Phone: SE-resize must not write into shared desktop `h` (search/dealBar).
   */
  const mobileBlocksDesktopHeight =
    !isDesktop && (id === 'heroText' || id === 'search' || id === 'dealBar');
  const canResizeDesign = designMode && !mobileBlocksDesktopHeight;

  const box = React.useMemo(() => {
    if (id === 'serviceRail') {
      const { itemW, itemH, gap, items, x, y, opacity } = layout.serviceRail;
      return {
        x,
        y,
        w: itemW,
        h: railStackHeight(itemH, gap, items.length),
        itemW,
        itemH,
        mobileX: 0,
        mobileY: 0,
        opacity,
      };
    }
    if (id === 'quickRail') {
      const { w, itemH, gap, items, x, y, opacity } = layout.quickRail;
      return {
        x,
        y,
        w,
        h: railStackHeight(itemH, gap, items.length),
        itemW: w,
        itemH,
        mobileX: 0,
        mobileY: 0,
        opacity,
      };
    }
    const b = layout[id];
    return {
      ...b,
      itemW: b.w,
      itemH: b.h,
      mobileX: b.mobileX ?? (id === 'heroText' ? 16 : 0),
      mobileY: b.mobileY ?? (id === 'heroText' ? 16 : 0),
    };
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
    origRect: SnapRect | null;
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
          ? {
              h: Math.max(
                id === 'heroText' ? 72 : id === 'typePanel' ? 80 : 40,
                Math.round(patch.h)
              ),
            }
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
    if (mode === 'move' && !canMoveDesign) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    setSelectedRailItemId(null);
    setSelectedTypeItemId(null);
    if (mode === 'move') {
      setActiveEditParams(canNudgeMobile ? ['mobileX', 'mobileY'] : ['x', 'y']);
    } else if (id === 'serviceRail' || id === 'quickRail') {
      setActiveEditParams(['itemW', 'itemH']);
    } else if (!applyGeometry && (id === 'search' || id === 'dealBar' || id === 'heroText')) {
      setActiveEditParams([]);
    } else if (!applyGeometry) {
      setActiveEditParams(['h']);
    } else {
      setActiveEditParams(['w', 'h']);
    }
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / missing pointer id */
    }
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: canNudgeMobile ? box.mobileX : box.x,
      origY: canNudgeMobile ? box.mobileY : box.y,
      origItemW: box.itemW,
      origItemH: box.itemH,
      origRect: rectFromDom(e.currentTarget as HTMLElement, id),
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
      if (canNudgeMobile) {
        const next = MOBILE_STACK_NUDGE_IDS.has(id)
          ? {
              // Stack blocks: mostly vertical spacing; keep X near 0
              mobileX: Math.max(-24, Math.min(24, Math.round(d.origX + dx))),
              // Allow pulling up enough to close the flex gap between cards
              mobileY: Math.max(-48, Math.min(64, Math.round(d.origY + dy))),
            }
          : {
              mobileX: Math.round(d.origX + dx),
              mobileY: Math.round(d.origY + dy),
            };
        if (id === 'heroText') {
          updateHeroText(next);
        } else if (
          id === 'dealBar' ||
          id === 'search' ||
          id === 'typePanel' ||
          id === 'map' ||
          id === 'listings'
        ) {
          updateBox(id, next);
        }
        return;
      }
      if (d.origRect && !e.ctrlKey) {
        const proposed = offsetRect(d.origRect, dx, dy);
        const snap = snapRectToTargets(
          proposed,
          collectDesignSnapTargets('blocks', { designable: id })
        );
        applyPatch({ x: d.origX + dx + snap.dx, y: d.origY + dy + snap.dy });
        setDesignSnapGuides(snap.guides);
      } else {
        applyPatch({ x: d.origX + dx, y: d.origY + dy });
        clearDesignSnapGuides();
      }
      return;
    }
    if (!applyGeometry) {
      // Never let phone height-drag mutate desktop search/dealBar/heroText `h`
      if (id === 'search' || id === 'dealBar' || id === 'heroText') return;
      applyPatch({ h: d.origItemH + dy });
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
    setActiveEditParams([]);
    clearDesignSnapGuides();
    if (started) endHistoryGesture();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const offsetScale = id === 'heroText' ? heroOffsetScale : designScale;
  const dX = scaleDesignOffset(box.x, offsetScale);
  const dY = scaleDesignOffset(box.y, offsetScale);
  const dW =
    id === 'serviceRail'
      ? scaleDesignPx(layout.serviceRail.itemW, designScale, 40)
      : id === 'quickRail'
        ? scaleDesignPx(layout.quickRail.w, designScale, 80)
        : box.w;
  const dH = scaleDesignPx(
    box.h,
    designScale,
    id === 'listings' ? 200 : id === 'map' ? 160 : id === 'typePanel' ? 80 : 40
  );
  const dMinH = scaleDesignPx(box.h, designScale, id === 'listings' ? 200 : 40);
  /** Public stacked blocks: relative `top` overlaps neighbors (map vs listings). Design Mode keeps Y nudge. */
  const stackTopClass = designMode ? 'md:top-[var(--d-y)]' : 'md:top-0';

  const geometryClass =
    id === 'heroText'
      ? 'max-md:absolute max-md:left-[var(--m-x)] max-md:top-[var(--m-y)] max-md:right-auto max-md:z-[35] max-md:!h-auto max-md:!w-auto max-md:!max-w-[calc(100%-24px)] md:relative md:left-[var(--d-x)] md:top-[var(--d-y)] md:h-auto md:min-h-[var(--d-min-h)] md:[translate:0_var(--hero-text-fix-y,0px)]'
      : id === 'search' || id === 'dealBar'
        ? `${id === 'search' ? 'max-md:min-h-[52px] ' : ''}max-md:relative max-md:ml-[var(--m-x)] max-md:mt-[var(--m-y)] max-md:!h-auto max-md:!w-full max-md:!max-w-full md:relative md:left-[var(--d-x)] md:top-[var(--d-y)] md:h-auto md:overflow-visible`
        : id === 'typePanel'
          ? `max-md:relative max-md:ml-[var(--m-x)] max-md:mt-[var(--m-y)] max-md:!h-auto max-md:!w-full max-md:!max-w-full md:relative md:left-[var(--d-x)] ${stackTopClass} md:h-[var(--d-h)] md:overflow-visible`
          : id === 'map'
            ? `max-md:relative max-md:ml-[var(--m-x)] max-md:mt-[var(--m-y)] max-md:!h-auto max-md:!w-full max-md:!max-w-full md:relative md:left-[var(--d-x)] ${stackTopClass} md:h-auto md:overflow-visible`
            : id === 'listings'
              ? `max-md:relative max-md:!h-auto max-md:!w-full max-md:!max-w-full md:relative md:left-[var(--d-x)] ${stackTopClass} md:overflow-visible`
              : id === 'serviceRail' || id === 'quickRail'
                ? 'max-md:relative md:relative md:left-[var(--d-x)] md:top-[var(--d-y)] md:h-[var(--d-h)] md:w-[var(--d-w)]'
                : 'max-md:relative md:relative md:left-[var(--d-x)] md:top-[var(--d-y)] md:h-[var(--d-h)] md:w-full md:max-w-[var(--d-max-w)]';

  return (
    <div
      className={`group/designable relative ${geometryClass} ${canSelectDesign ? 'z-20' : ''} ${className}`}
      style={
        {
          ...style,
          '--d-x': `${dX}px`,
          '--d-y': `${dY}px`,
          '--d-w': `${dW}px`,
          '--d-h': `${dH}px`,
          '--d-max-w': `${box.w}px`,
          '--d-min-h': `${dMinH}px`,
          '--m-x': `${box.mobileX}px`,
          '--m-y': `${box.mobileY}px`,
          ...(id === 'serviceRail' || id === 'quickRail'
            ? {
                width: dW,
                height: dH,
              }
            : {
                width: '100%',
                maxWidth: box.w,
                ...(id === 'typePanel' ? { height: dH } : null),
                ...(id === 'map' ? { height: 'auto' } : null),
                ...(id === 'search' || id === 'dealBar' || id === 'heroText'
                  ? { minHeight: dMinH, height: 'auto' }
                  : null),
                ...(id === 'listings' ? { minHeight: dMinH, height: 'auto' } : null),
              }),
          outline: canSelectDesign
            ? selected
              ? '2px solid #2563eb'
              : '1px dashed #94a3b8'
            : undefined,
          // Inset outline so Design Mode box matches public layout size
          outlineOffset: canSelectDesign ? -1 : undefined,
          cursor: canMoveDesign ? 'move' : canSelectDesign ? 'pointer' : undefined,
          touchAction: canMoveDesign || (canResizeDesign && selected) ? 'none' : undefined,
        } as unknown as React.CSSProperties
      }
      data-designable={id}
      onClick={
        canSelectDesign
          ? (e) => {
              e.stopPropagation();
              setSelectedId(id);
              setSelectedRailItemId(null);
              setSelectedTypeItemId(null);
            }
          : undefined
      }
      onPointerDown={canMoveDesign ? (e) => startDrag(e, 'move') : undefined}
      onPointerMove={canMoveDesign || canResizeDesign ? onPointerMove : undefined}
      onPointerUp={canMoveDesign || canResizeDesign ? onPointerUp : undefined}
      onPointerCancel={canMoveDesign || canResizeDesign ? onPointerUp : undefined}
    >
      {canSelectDesign && !selected ? (
        <span
          className="pointer-events-none absolute inset-0 rounded opacity-0 ring-1 ring-dashed ring-slate-400/70 transition group-hover/designable:opacity-100"
          aria-hidden
        />
      ) : null}
      {canSelectDesign ? <DesignableBadge id={id} selected={selected} /> : null}
      <div
        className={
          canMoveDesign
            ? // Phone stack + abs nudge: children must not steal the drag gesture
              !isDesktop &&
              (MOBILE_STACK_NUDGE_IDS.has(id) || MOBILE_ABS_NUDGE_IDS.has(id))
              ? 'pointer-events-none h-full w-full'
              : id === 'serviceRail' ||
                  id === 'quickRail' ||
                  id === 'typePanel' ||
                  id === 'listings' ||
                  id === 'search' ||
                  id === 'dealBar'
                ? 'h-full w-full'
                : 'pointer-events-none h-full w-full'
            : 'h-full w-full'
        }
        style={{ opacity: clampOpacity(box.opacity) }}
      >
        {children}
      </div>

      {canResizeDesign && selected ? (
        <div
          className="absolute bottom-0 right-0 z-30 h-5 w-5 translate-x-1/3 translate-y-1/3 cursor-se-resize rounded-sm bg-blue-600 shadow"
          title={applyGeometry ? 'სიგანე და სიმაღლე' : 'სიმაღლე'}
          onPointerDown={(e) => startDrag(e, 'resize')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}
    </div>
  );
}
