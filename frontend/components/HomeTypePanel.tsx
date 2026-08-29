'use client';

import React from 'react';

import type { FiltersState } from '@/components/Filters';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { useTheme } from '@/components/ThemeProvider';
import {
  DEFAULT_TYPE_PANEL_ITEMS,
  TYPE_PANEL_COUNT_FONT_DEFAULT,
  TYPE_PANEL_COUNT_POS_DEFAULT,
  TYPE_PANEL_ICON_FONT_DEFAULT,
  TYPE_PANEL_ICON_POS_DEFAULT,
  TYPE_PANEL_LABEL_FONT_DEFAULT,
  TYPE_PANEL_LABEL_MAX_W_DEFAULT,
  TYPE_PANEL_LABEL_POS_DEFAULT,
  TYPE_PANEL_MEDIA_POS_DEFAULT,
  TYPE_PANEL_MEDIA_SCALE_DEFAULT,
  TYPE_PANEL_RADIUS_DEFAULT,
  clampFontSize,
  clampMediaScale,
  typePanelOverlayGradient,
  clampRailPercent,
  clampRailRadius,
  clampTypeLabelMaxW,
  clampOpacity,
  typePanelItemFrameCss,
  resolveTypePanelItemsForMode,
  type TypePanelItem,
} from '@/lib/homeDesignLayout';
import { scaleDesignPx } from '@/lib/useIsDesignDesktop';
import {
  clearDesignSnapGuides,
  collectDesignSnapTargets,
  setDesignSnapGuides,
  snapPointToTargets,
} from '@/lib/designSnap';
import { resolveHeroImageUrls, revokeHeroUrls } from '@/lib/heroImageStorage';
import {
  externalMediaDisplayUrl,
  type DesignMediaKind,
} from '@/lib/designMedia';
import { LAND_STATUS_OPTIONS } from '@/lib/propertyTypeUi';

export const PROPERTY_CATEGORIES = [
  { value: 'apartment', key: 'apartment', icon: '🏢' },
  { value: 'house', key: 'house', icon: '🏠' },
  { value: 'commercial', key: 'commercial', icon: '🏪' },
  { value: 'land', key: 'land', icon: '🌍' },
  { value: 'cottage', key: 'cottage', icon: '🏡' },
  { value: 'hotel', key: 'hotel', icon: '🏨' },
  { value: 'building', key: 'building', icon: '🏗️' },
  { value: 'warehouse', key: 'warehouse', icon: '📦' },
  { value: 'parking', key: 'parking', icon: '🚗' },
  { value: 'business', key: 'business', icon: '💼' },
] as const;

/** Stock KA names in the saved design — translate unless the admin typed a custom label. */
function typePanelDisplayLabel(
  typeId: string,
  storedLabel: string,
  tr: (key: string, fallback: string) => string
): string {
  const custom = storedLabel.trim();
  const stockKa =
    DEFAULT_TYPE_PANEL_ITEMS.find((item) => item.id === typeId)?.label?.trim() || typeId;
  if (!custom || custom === stockKa) return tr(typeId, stockKa);
  return custom;
}

export function togglePropertyType(
  prev: FiltersState,
  catValue: string,
  isSelected: boolean
): FiltersState {
  const nextType = isSelected
    ? prev.type.filter((tp) => tp !== catValue)
    : [...prev.type, catValue];
  return {
    ...prev,
    type: nextType,
    landStatus: nextType.includes('land') ? prev.landStatus || [] : [],
  };
}

type TypeMedia = {
  url?: string;
  kind?: DesignMediaKind;
  embedUrl?: string;
};

function useTypePanelMedia(items: TypePanelItem[]) {
  const imageIds = items.map((it) => it.imageId).filter(Boolean) as string[];
  const [blobById, setBlobById] = React.useState<
    Record<string, { url: string; kind: DesignMediaKind }>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string; kind: DesignMediaKind }[] = [];
    void (async () => {
      if (imageIds.length === 0) {
        if (!cancelled) setBlobById({});
        return;
      }
      loaded = await resolveHeroImageUrls(imageIds);
      if (cancelled) {
        revokeHeroUrls(loaded);
        return;
      }
      const next: Record<string, { url: string; kind: DesignMediaKind }> = {};
      for (const entry of loaded) next[entry.id] = { url: entry.url, kind: entry.kind };
      setBlobById(next);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return React.useMemo(() => {
    const map: Record<string, TypeMedia> = {};
    for (const item of items) {
      if (item.mediaUrl) {
        const kind = item.mediaKind || 'image';
        const display = externalMediaDisplayUrl(kind, item.mediaUrl);
        map[item.id] = {
          url: display.url,
          kind,
          embedUrl: display.embedUrl,
        };
      } else if (item.imageId && blobById[item.imageId]) {
        const blob = blobById[item.imageId];
        map[item.id] = {
          url: blob.url,
          kind: blob.kind,
          embedUrl: blob.kind === 'video' ? blob.url : undefined,
        };
      }
    }
    return map;
  }, [items, blobById]);
}

function typeMediaFrameStyle(scale: number, x: number, y: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${scale}%`,
    height: `${scale}%`,
    maxWidth: 'none',
    transform: 'translate(-50%, -50%)',
    objectFit: 'cover',
  };
}

function TypeCoverMedia({
  media,
  scale,
  x,
  y,
}: {
  media?: TypeMedia;
  scale: number;
  x: number;
  y: number;
}) {
  if (!media?.url && !media?.embedUrl) return null;
  const frame = typeMediaFrameStyle(scale, x, y);

  if (media.kind === 'video' && media.embedUrl?.includes('youtube.com/embed')) {
    return (
      <iframe
        src={media.embedUrl}
        title=""
        className="pointer-events-none border-0"
        style={frame}
        allow="autoplay; encrypted-media"
        tabIndex={-1}
      />
    );
  }

  if (media.kind === 'video') {
    return (
      <video
        src={media.embedUrl || media.url}
        className="pointer-events-none"
        style={frame}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      />
    );
  }

  return (
    <img
      src={media.url}
      alt=""
      draggable={false}
      className="pointer-events-none"
      style={frame}
    />
  );
}

type TypeTextLayer = 'label' | 'count' | 'icon';

type TypeDragState =
  | {
      kind: 'text';
      layer: TypeTextLayer;
      itemId: string;
      box: DOMRect;
    }
  | {
      kind: 'media';
      itemId: string;
      box: DOMRect;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      kind: 'scale';
      itemId: string;
      startX: number;
      startY: number;
      origScale: number;
      historyStarted: boolean;
    };

function useTypePanelItemDrag(enabled: boolean) {
  const design = useHomeDesignOptional();
  const dragRef = React.useRef<TypeDragState | null>(null);

  const selectCard = React.useCallback(
    (itemId: string) => {
      if (!design) return;
      design.setSelectedId('typePanel');
      design.setSelectedTypeItemId(itemId);
      design.setSelectedRailItemId(null);
      design.setSelectedSearchControlId(null);
      design.setSelectedDealChipId(null);
      design.setSelectedHeaderItemId(null);
    },
    [design]
  );

  const capture = (el: HTMLElement, pointerId: number) => {
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  };

  const onTextDown = React.useCallback(
    (e: React.PointerEvent, itemId: string, layer: TypeTextLayer) => {
      if (!enabled || !design) return;
      e.preventDefault();
      e.stopPropagation();
      const host = (e.currentTarget as HTMLElement).closest('[data-type-item]');
      if (!(host instanceof HTMLElement)) return;
      dragRef.current = { kind: 'text', layer, itemId, box: host.getBoundingClientRect() };
      selectCard(itemId);
      design.setActiveEditParams(
        layer === 'label' ? ['labelX', 'labelY'] : layer === 'count' ? ['countX', 'countY'] : ['iconX', 'iconY']
      );
      design.beginHistoryGesture();
      capture(e.currentTarget as HTMLElement, e.pointerId);
    },
    [design, enabled, selectCard]
  );

  const onMediaDown = React.useCallback(
    (e: React.PointerEvent, itemId: string, origX: number, origY: number) => {
      if (!enabled || !design) return;
      e.preventDefault();
      e.stopPropagation();
      const host = (e.currentTarget as HTMLElement).closest('[data-type-item]');
      if (!(host instanceof HTMLElement)) return;
      dragRef.current = {
        kind: 'media',
        itemId,
        box: host.getBoundingClientRect(),
        startX: e.clientX,
        startY: e.clientY,
        origX,
        origY,
      };
      selectCard(itemId);
      design.setActiveEditParams(['mediaX', 'mediaY']);
      design.beginHistoryGesture();
      capture(e.currentTarget as HTMLElement, e.pointerId);
    },
    [design, enabled, selectCard]
  );

  const onScaleDown = React.useCallback(
    (e: React.PointerEvent, itemId: string, origScale: number) => {
      if (!enabled || !design) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        kind: 'scale',
        itemId,
        startX: e.clientX,
        startY: e.clientY,
        origScale,
        historyStarted: false,
      };
      selectCard(itemId);
      design.setActiveEditParams(['mediaScale']);
      capture(e.currentTarget as HTMLElement, e.pointerId);
    },
    [design, enabled, selectCard]
  );

  const onMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !design || !dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const d = dragRef.current;
      if (d.kind === 'text') {
        if (d.box.width <= 0 || d.box.height <= 0) return;
        let x = clampRailPercent(((e.clientX - d.box.left) / d.box.width) * 100, 50);
        let y = clampRailPercent(((e.clientY - d.box.top) / d.box.height) * 100, 50);
        if (!e.ctrlKey) {
          const px = d.box.left + (x / 100) * d.box.width;
          const py = d.box.top + (y / 100) * d.box.height;
          const snapped = snapPointToTargets(
            px,
            py,
            collectDesignSnapTargets('chips', {
              chip: `${d.itemId}:${d.layer}`,
              typeCard: d.itemId,
            })
          );
          x = clampRailPercent(((snapped.x - d.box.left) / d.box.width) * 100, 50);
          y = clampRailPercent(((snapped.y - d.box.top) / d.box.height) * 100, 50);
          setDesignSnapGuides(snapped.guides);
        } else {
          clearDesignSnapGuides();
        }
        if (d.layer === 'label') design.updateTypePanelItem(d.itemId, { labelX: x, labelY: y });
        else if (d.layer === 'count') design.updateTypePanelItem(d.itemId, { countX: x, countY: y });
        else design.updateTypePanelItem(d.itemId, { iconX: x, iconY: y });
        return;
      }
      if (d.kind === 'media') {
        if (d.box.width <= 0 || d.box.height <= 0) return;
        let x = clampRailPercent(d.origX + ((e.clientX - d.startX) / d.box.width) * 100, 50);
        let y = clampRailPercent(d.origY + ((e.clientY - d.startY) / d.box.height) * 100, 50);
        if (!e.ctrlKey) {
          const px = d.box.left + (x / 100) * d.box.width;
          const py = d.box.top + (y / 100) * d.box.height;
          const snapped = snapPointToTargets(
            px,
            py,
            collectDesignSnapTargets('chips', {
              chip: `${d.itemId}:media`,
              typeCard: d.itemId,
            })
          );
          x = clampRailPercent(((snapped.x - d.box.left) / d.box.width) * 100, 50);
          y = clampRailPercent(((snapped.y - d.box.top) / d.box.height) * 100, 50);
          setDesignSnapGuides(snapped.guides);
        } else {
          clearDesignSnapGuides();
        }
        design.updateTypePanelItem(d.itemId, { mediaX: x, mediaY: y });
        return;
      }
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.historyStarted) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        design.beginHistoryGesture();
        d.historyStarted = true;
      }
      design.updateTypePanelItem(d.itemId, {
        mediaScale: clampMediaScale(d.origScale + (dx + dy) * 0.45),
      });
    },
    [design, enabled]
  );

  const onUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !design || !dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const scaleDrag = dragRef.current.kind === 'scale' ? dragRef.current : null;
      dragRef.current = null;
      design.setActiveEditParams([]);
      clearDesignSnapGuides();
      if (!scaleDrag || scaleDrag.historyStarted) design.endHistoryGesture();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    [design, enabled]
  );

  return { onTextDown, onMediaDown, onScaleDown, onMove, onUp, selectCard };
}

function TypeTextChip({
  layer,
  itemId,
  x,
  y,
  designMode,
  className,
  style,
  children,
  drag,
  wrap,
  wrapMaxW,
}: {
  layer: TypeTextLayer;
  itemId: string;
  x: number;
  y: number;
  designMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  drag: ReturnType<typeof useTypePanelItemDrag>;
  wrap?: boolean;
  wrapMaxW?: number;
}) {
  return (
    <span
      data-design-chip={`${itemId}:${layer}`}
      className={`absolute z-[2] px-0.5 text-center leading-tight ${
        designMode
          ? 'pointer-events-auto cursor-grab touch-none select-none rounded-md ring-1 ring-blue-500/70 active:cursor-grabbing'
          : 'pointer-events-none'
      } ${className || ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        whiteSpace: wrap ? 'pre-line' : 'nowrap',
        maxWidth: wrap ? `${wrapMaxW ?? 140}%` : undefined,
        ...style,
      }}
      onPointerDown={designMode ? (e) => drag.onTextDown(e, itemId, layer) : undefined}
      onPointerMove={designMode ? drag.onMove : undefined}
      onPointerUp={designMode ? drag.onUp : undefined}
      onPointerCancel={designMode ? drag.onUp : undefined}
    >
      {children}
    </span>
  );
}

type TypeCategoryCardProps = {
  cat: (typeof PROPERTY_CATEGORIES)[number];
  item: TypePanelItem;
  compact: boolean;
  designMode: boolean;
  isFilterSelected: boolean;
  isDesignSelected: boolean;
  media?: TypeMedia;
  count: number;
  displayLabel: string;
  designScale: number;
  fallbackIcon: string;
  onFilterToggle: () => void;
  drag: ReturnType<typeof useTypePanelItemDrag>;
};

function TypeCategoryCard({
  cat,
  item,
  compact,
  designMode,
  isFilterSelected,
  isDesignSelected,
  media,
  count,
  displayLabel,
  designScale,
  fallbackIcon,
  onFilterToggle,
  drag,
}: TypeCategoryCardProps) {
  const design = useHomeDesignOptional();
  const cardRef = React.useRef<HTMLButtonElement>(null);
  const hasMedia = Boolean(media?.url || media?.embedUrl);
  const radius = clampRailRadius(item.borderRadius, TYPE_PANEL_RADIUS_DEFAULT);
  const labelFontSize = scaleDesignPx(
    clampFontSize(
      compact
        ? Math.min(item.labelFontSize ?? TYPE_PANEL_LABEL_FONT_DEFAULT, 10)
        : item.labelFontSize,
      TYPE_PANEL_LABEL_FONT_DEFAULT,
      8,
      compact ? 11 : 48
    ),
    compact ? 1 : designScale,
    8
  );
  const countFontSize = scaleDesignPx(
    clampFontSize(
      compact
        ? Math.min(item.countFontSize ?? TYPE_PANEL_COUNT_FONT_DEFAULT, 9)
        : item.countFontSize,
      TYPE_PANEL_COUNT_FONT_DEFAULT,
      8,
      compact ? 10 : 32
    ),
    compact ? 1 : designScale,
    8
  );
  const iconFontSize = scaleDesignPx(
    clampFontSize(
      compact
        ? Math.min(item.iconFontSize ?? TYPE_PANEL_ICON_FONT_DEFAULT, 18)
        : item.iconFontSize,
      TYPE_PANEL_ICON_FONT_DEFAULT,
      12,
      compact ? 20 : 64
    ),
    compact ? 1 : designScale,
    12
  );
  const labelX = clampRailPercent(item.labelX, TYPE_PANEL_LABEL_POS_DEFAULT.x);
  const labelY = clampRailPercent(item.labelY, TYPE_PANEL_LABEL_POS_DEFAULT.y);
  const countX = clampRailPercent(item.countX, TYPE_PANEL_COUNT_POS_DEFAULT.x);
  const countY = clampRailPercent(item.countY, TYPE_PANEL_COUNT_POS_DEFAULT.y);
  const iconX = clampRailPercent(item.iconX, TYPE_PANEL_ICON_POS_DEFAULT.x);
  const iconY = clampRailPercent(item.iconY, TYPE_PANEL_ICON_POS_DEFAULT.y);
  const mediaScale = clampMediaScale(item.mediaScale);
  const mediaX = clampRailPercent(item.mediaX, TYPE_PANEL_MEDIA_POS_DEFAULT.x);
  const mediaY = clampRailPercent(item.mediaY, TYPE_PANEL_MEDIA_POS_DEFAULT.y);
  const canEditMedia = designMode && hasMedia && !compact;
  const overlayCss = hasMedia ? typePanelOverlayGradient(item.overlayOpacity) : null;
  const frameCss = typePanelItemFrameCss(item);

  React.useEffect(() => {
    if (!canEditMedia || !isDesignSelected || !design) return;
    const el = cardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      design.updateTypePanelItem(cat.value, {
        mediaScale: clampMediaScale(mediaScale - Math.sign(e.deltaY) * 8),
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [canEditMedia, isDesignSelected, mediaScale, design, cat.value]);

  if (compact) {
    const thumbUrl = media?.url && media.kind !== 'video' ? media.url : undefined;
    const selectedText =
      isFilterSelected && !designMode
        ? 'text-blue-700 dark:text-amber-400'
        : 'text-slate-700 dark:text-zinc-200';
    return (
      <button
        ref={cardRef}
        type="button"
        data-type-item={cat.value}
        onClick={
          designMode
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                drag.selectCard(cat.value);
              }
            : onFilterToggle
        }
        className={`flex min-h-11 min-w-0 items-center gap-1.5 overflow-hidden rounded-xl border px-1.5 py-1.5 text-left transition-colors ${
          isDesignSelected
            ? 'border-blue-600 ring-2 ring-blue-400/50 dark:border-blue-400'
            : isFilterSelected
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 dark:border-amber-500 dark:bg-amber-950/40 dark:ring-amber-500'
              : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
        }`}
        style={{ opacity: clampOpacity(item.opacity) }}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg ${
            isFilterSelected ? 'bg-blue-100 dark:bg-amber-950/50' : 'bg-slate-100 dark:bg-zinc-800'
          }`}
          aria-hidden
        >
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-base leading-none">{item.icon || fallbackIcon}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          {item.labelHidden !== true ? (
            <span className={`block truncate text-[13px] font-medium leading-5 ${selectedText}`}>
              {displayLabel}
            </span>
          ) : null}
          {item.countHidden !== true ? (
            <span className="block truncate text-[11px] leading-4 text-slate-400 dark:text-zinc-500">
              {count}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <button
      ref={cardRef}
      type="button"
      data-type-item={cat.value}
      onPointerDown={
        designMode
          ? (e) => {
              e.stopPropagation();
              drag.selectCard(cat.value);
            }
          : undefined
      }
      onClick={
        designMode
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              drag.selectCard(cat.value);
            }
          : onFilterToggle
      }
      className={`relative min-w-0 overflow-visible transition-all ${
        compact ? 'min-h-[4rem] px-0.5 py-1.5' : 'h-full min-h-0'
      } ${frameCss ? 'border-solid' : 'border-2'} ${
        designMode || compact ? '' : 'hover:scale-105 hover:shadow-md'
      } ${
        isDesignSelected
          ? `${frameCss ? '' : 'border-blue-600 dark:border-blue-400 '}ring-2 ring-blue-400/50`
          : isFilterSelected
            ? `${frameCss ? '' : 'border-blue-500 dark:border-amber-500 '}ring-2 ring-blue-500 bg-blue-50 shadow-md dark:ring-amber-500 dark:bg-amber-950/40 dark:shadow-amber-900/20`
            : frameCss
              ? 'bg-white dark:bg-zinc-900'
              : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-600/50'
      }`}
      style={{
        borderRadius: radius,
        opacity: clampOpacity(item.opacity),
        ...(frameCss || {}),
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{ borderRadius: Math.max(0, radius - (frameCss?.borderWidth ?? 2)) }}
        aria-hidden
      >
        <TypeCoverMedia media={media} scale={mediaScale} x={mediaX} y={mediaY} />
        {overlayCss ? (
          <span className="absolute inset-0" style={{ background: overlayCss }} />
        ) : null}
      </span>
      {canEditMedia ? (
        <span
          className="absolute inset-0 z-[1] cursor-grab touch-none active:cursor-grabbing"
          style={{ borderRadius: Math.max(0, radius - (frameCss?.borderWidth ?? 2)) }}
          onPointerDown={(e) => drag.onMediaDown(e, cat.value, mediaX, mediaY)}
          onPointerMove={drag.onMove}
          onPointerUp={drag.onUp}
          onPointerCancel={drag.onUp}
        />
      ) : null}

      {!hasMedia ? (
        <TypeTextChip
          layer="icon"
          itemId={cat.value}
          x={iconX}
          y={iconY}
          designMode={designMode}
          drag={drag}
          style={{ fontSize: iconFontSize }}
        >
          {item.icon || fallbackIcon}
        </TypeTextChip>
      ) : null}

      {item.labelHidden !== true ? (
      <TypeTextChip
        layer="label"
        itemId={cat.value}
        x={labelX}
        y={labelY}
        designMode={designMode}
        drag={drag}
        wrap={item.labelWrap === true}
        wrapMaxW={clampTypeLabelMaxW(item.labelMaxW, TYPE_PANEL_LABEL_MAX_W_DEFAULT)}
        className={`font-medium ${
          hasMedia
            ? 'text-white drop-shadow'
            : isFilterSelected && !designMode
              ? 'text-blue-700 dark:text-amber-400'
              : 'text-slate-700 dark:text-zinc-300'
        }`}
        style={{
          fontSize: labelFontSize,
          color: item.labelColor || undefined,
        }}
      >
        {displayLabel}
      </TypeTextChip>
      ) : null}

      {item.countHidden !== true ? (
      <TypeTextChip
        layer="count"
        itemId={cat.value}
        x={countX}
        y={countY}
        designMode={designMode}
        drag={drag}
        className={
          hasMedia
            ? 'text-white/90 drop-shadow'
            : isFilterSelected && !designMode
              ? 'text-blue-600 dark:text-amber-500/90'
              : 'text-slate-400 dark:text-zinc-500'
        }
        style={{
          fontSize: countFontSize,
          color: item.countColor || undefined,
        }}
      >
        {count}
      </TypeTextChip>
      ) : null}

      {canEditMedia && isDesignSelected ? (
        <span
          className="absolute bottom-0 right-0 z-[3] h-3.5 w-3.5 translate-x-1/4 translate-y-1/4 cursor-se-resize rounded-sm bg-blue-600 shadow"
          title="ფოტოს ზომა"
          onPointerDown={(e) => drag.onScaleDown(e, cat.value, mediaScale)}
          onPointerMove={drag.onMove}
          onPointerUp={drag.onUp}
          onPointerCancel={drag.onUp}
        />
      ) : null}
    </button>
  );
}

type HomeTypePanelProps = {
  filters: FiltersState;
  onPatch: (updater: (prev: FiltersState) => FiltersState) => void;
  categoryCounts: Record<string, number>;
  tr: (key: string, fallback: string) => string;
  /** When true, hide interactive styling cues for Design Mode canvas */
  designMode?: boolean;
  /** Inner padding (px) so selected/hover borders aren’t clipped by the frame */
  pad?: number;
  /** Gap between category cards (px) */
  gap?: number;
  /** Uniform shrink with the rest of the homepage design canvas */
  designScale?: number;
  /** Phone accordion only — used inside homepage filters */
  mobileOnly?: boolean;
  /** Hide the phone accordion (desktop grid only) */
  hideMobile?: boolean;
};

/** Homepage property-type grid only (land status is a sibling outside the sized box) */
export function HomeTypePanel({
  filters,
  onPatch,
  categoryCounts,
  tr,
  designMode = false,
  pad = 10,
  gap = 12,
  designScale = 1,
  mobileOnly = false,
  hideMobile = false,
}: HomeTypePanelProps) {
  const design = useHomeDesignOptional();
  const { activeModeId } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const drag = useTypePanelItemDrag(designMode);

  const items = React.useMemo(() => {
    const fromLayout = design?.layout.typePanel.items;
    const base = fromLayout?.length ? fromLayout : DEFAULT_TYPE_PANEL_ITEMS;
    return resolveTypePanelItemsForMode(base, activeModeId || 'day');
  }, [design?.layout.typePanel.items, activeModeId]);

  const itemById = React.useMemo(() => {
    const map = new Map<string, TypePanelItem>();
    for (const it of items) map.set(it.id, it);
    return map;
  }, [items]);

  const mediaById = useTypePanelMedia(items);
  const selectedTypeItemId = design?.selectedTypeItemId ?? null;

  const renderCards = (compact: boolean) =>
    PROPERTY_CATEGORIES.map((cat) => {
      const item = itemById.get(cat.value) || {
        id: cat.value,
        label: '',
        icon: cat.icon,
        borderRadius: TYPE_PANEL_RADIUS_DEFAULT,
      };
      const isFilterSelected = filters.type.includes(cat.value);
      return (
        <TypeCategoryCard
          key={cat.value}
          cat={cat}
          item={item}
          compact={compact}
          designMode={designMode}
          isFilterSelected={isFilterSelected}
          isDesignSelected={designMode && selectedTypeItemId === cat.value}
          media={mediaById[cat.value]}
          count={categoryCounts[cat.value] || 0}
          displayLabel={typePanelDisplayLabel(cat.value, item.label, tr)}
          designScale={designScale}
          fallbackIcon={cat.icon}
          onFilterToggle={() =>
            onPatch((prev) => togglePropertyType(prev, cat.value, isFilterSelected))
          }
          drag={drag}
        />
      );
    });

  const mobileAccordion = (
    <div className={mobileOnly ? 'w-full min-w-0' : 'md:hidden'}>
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        <span>{tr('choose_property_type', 'აირჩიეთ ქონების ტიპი')}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {mobileOpen ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            {renderCards(true)}
          </div>
      ) : null}
    </div>
  );

  if (mobileOnly) return mobileAccordion;

  return (
    <div
      className="box-border flex h-full w-full flex-col overflow-visible rounded-xl bg-transparent max-md:p-0 md:p-[var(--type-pad)]"
      style={{ '--type-pad': `${pad}px` } as React.CSSProperties}
    >
      {hideMobile ? null : mobileAccordion}

      <div
        className="hidden h-full min-h-0 grid-cols-5 content-stretch md:grid xl:grid-cols-10"
        style={{ gap }}
      >
        {renderCards(false)}
      </div>
    </div>
  );
}

/** Land status chips — outside typePanel so Designable height does not clip them */
export function HomeLandStatusPanel({
  filters,
  onPatch,
  tr,
}: {
  filters: FiltersState;
  onPatch: (updater: (prev: FiltersState) => FiltersState) => void;
  tr: (key: string, fallback: string) => string;
}) {
  if (!filters.type.includes('land')) return null;

  return (
    <div className="relative z-10 mx-auto w-full max-w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="shrink-0 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          {tr('filter_land_status', 'მიწის სტატუსი')}
        </div>
        <div className="flex flex-wrap gap-2">
          {LAND_STATUS_OPTIONS.map((item) => {
            const selected = (filters.landStatus || []).includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  onPatch((prev) => ({
                    ...prev,
                    landStatus: selected
                      ? (prev.landStatus || []).filter((s) => s !== item.value)
                      : [...(prev.landStatus || []), item.value],
                  }))
                }
                className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium leading-5 transition-colors ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400'
                }`}
              >
                {tr(item.labelKey, item.value)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
