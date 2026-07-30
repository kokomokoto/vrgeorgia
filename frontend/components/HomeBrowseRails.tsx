'use client';

import React from 'react';
import Link from 'next/link';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  RAIL_HINT_FONT_DEFAULT,
  RAIL_LABEL_DEFAULT,
  RAIL_LABEL_FONT_DEFAULT,
  RAIL_RADIUS_CIRCLE,
  RAIL_RADIUS_ROUNDED,
  clampFontSize,
  clampRailPercent,
  clampRailRadius,
  type RailItem,
} from '@/lib/homeDesignLayout';
import { resolveHeroImageUrls, revokeHeroUrls } from '@/lib/heroImageStorage';

function useRailImageUrls(items: RailItem[]) {
  const imageIds = items.map((it) => it.imageId).filter(Boolean) as string[];
  const [urlByImageId, setUrlByImageId] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    void (async () => {
      if (imageIds.length === 0) {
        if (!cancelled) setUrlByImageId({});
        return;
      }
      loaded = await resolveHeroImageUrls(imageIds);
      if (cancelled) {
        revokeHeroUrls(loaded);
        return;
      }
      const next: Record<string, string> = {};
      for (const entry of loaded) next[entry.id] = entry.url;
      setUrlByImageId(next);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return urlByImageId;
}

function useRailLabelDrag(
  rail: 'serviceRail' | 'quickRail',
  enabled: boolean
) {
  const design = useHomeDesignOptional();
  const dragRef = React.useRef<{
    itemId: string;
    box: DOMRect;
  } | null>(null);

  const onLabelPointerDown = React.useCallback(
    (e: React.PointerEvent, itemId: string) => {
      if (!enabled || !design) return;
      e.preventDefault();
      e.stopPropagation();
      const host = (e.currentTarget as HTMLElement).closest('[data-rail-item]');
      if (!(host instanceof HTMLElement)) return;
      const box = host.getBoundingClientRect();
      dragRef.current = { itemId, box };
      design.beginHistoryGesture();
      design.setSelectedId(rail);
      design.setSelectedRailItemId(itemId);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [design, enabled]
  );

  const onLabelPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !design || !dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const { itemId, box } = dragRef.current;
      if (box.width <= 0 || box.height <= 0) return;
      const labelX = clampRailPercent(((e.clientX - box.left) / box.width) * 100, 50);
      const labelY = clampRailPercent(((e.clientY - box.top) / box.height) * 100, 50);
      design.updateRailItem(rail, itemId, { labelX, labelY });
    },
    [design, enabled, rail]
  );

  const onLabelPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !design || !dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = null;
      design.endHistoryGesture();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    [design, enabled]
  );

  return { onLabelPointerDown, onLabelPointerMove, onLabelPointerUp };
}

function RailLabel({
  item,
  imageUrl,
  designMode,
  drag,
  showHint,
  rail,
}: {
  item: RailItem;
  imageUrl?: string;
  designMode: boolean;
  drag: ReturnType<typeof useRailLabelDrag>;
  showHint?: boolean;
  rail: 'serviceRail' | 'quickRail';
}) {
  const design = useHomeDesignOptional();
  const labelX = clampRailPercent(item.labelX, RAIL_LABEL_DEFAULT.x);
  const labelY = clampRailPercent(item.labelY, RAIL_LABEL_DEFAULT.y);
  const onImage = Boolean(imageUrl);
  const labelFontSize = clampFontSize(item.labelFontSize, RAIL_LABEL_FONT_DEFAULT, 10, 48);
  const hintFontSize = clampFontSize(item.hintFontSize, RAIL_HINT_FONT_DEFAULT, 9, 32);
  const labelColor = item.labelColor || (onImage ? '#ffffff' : 'var(--theme-accent)');
  const hintColor = item.hintColor || (onImage ? 'rgba(255,255,255,0.85)' : 'var(--theme-muted-text)');

  return (
    <span
      className={`absolute z-[1] max-w-[82%] px-2 text-center leading-tight font-semibold ${
        designMode ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      } ${onImage ? 'drop-shadow' : ''} ${
        designMode ? 'rounded-md ring-2 ring-blue-500/70 ring-offset-1 ring-offset-transparent' : ''
      }`}
      style={{
        left: `${labelX}%`,
        top: `${labelY}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: labelFontSize,
        color: labelColor,
      }}
      onPointerDown={designMode ? (e) => drag.onLabelPointerDown(e, item.id) : undefined}
      onPointerMove={designMode ? drag.onLabelPointerMove : undefined}
      onPointerUp={designMode ? drag.onLabelPointerUp : undefined}
      onPointerCancel={designMode ? drag.onLabelPointerUp : undefined}
      onClick={
        designMode
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              design?.setSelectedId(rail);
              design?.setSelectedRailItemId(item.id);
            }
          : undefined
      }
    >
      <span className="block">{item.label}</span>
      {showHint && item.hint ? (
        <span
          className="mt-0.5 block leading-snug font-normal"
          style={{ fontSize: hintFontSize, color: hintColor }}
        >
          {item.hint}
        </span>
      ) : null}
    </span>
  );
}

export function HomeServiceRail({
  title: titleProp,
  items: itemsProp,
}: {
  title?: string;
  items?: RailItem[];
}) {
  const design = useHomeDesignOptional();
  const designMode = design?.designMode ?? false;
  const itemW = design?.layout.serviceRail.itemW ?? 200;
  const itemH = design?.layout.serviceRail.itemH ?? 200;
  const gap = design?.layout.serviceRail.gap ?? 16;
  const title = design?.layout.serviceRail.title || titleProp || 'მომსახურება';
  const items = design?.layout.serviceRail.items?.length
    ? design.layout.serviceRail.items
    : itemsProp || [];
  const imageUrls = useRailImageUrls(items);
  const drag = useRailLabelDrag('serviceRail', designMode);

  return (
    <aside className="flex flex-col items-center" style={{ gap }} aria-label={title}>
      {items.map((item) => {
        const imageUrl = item.imageId ? imageUrls[item.imageId] : undefined;
        const radius = clampRailRadius(item.borderRadius, RAIL_RADIUS_CIRCLE);
        return (
          <Link
            key={item.id}
            href={item.href || '#'}
            data-rail-item={item.id}
            className="group relative block overflow-hidden border transition"
            data-theme-surface
            style={{
              width: itemW,
              height: itemH,
              borderRadius: radius,
              backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onPointerDown={
              designMode
                ? (e) => {
                    e.stopPropagation();
                    design?.setSelectedId('serviceRail');
                    design?.setSelectedRailItemId(item.id);
                  }
                : undefined
            }
            onClick={
              designMode
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    design?.setSelectedId('serviceRail');
                    design?.setSelectedRailItemId(item.id);
                  }
                : undefined
            }
          >
            {imageUrl ? (
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
                aria-hidden
              />
            ) : null}
            <RailLabel
              item={item}
              imageUrl={imageUrl}
              designMode={designMode}
              drag={drag}
              rail="serviceRail"
            />
          </Link>
        );
      })}
    </aside>
  );
}

export function HomeQuickRail({
  title: titleProp,
  items: itemsProp,
}: {
  title?: string;
  items?: RailItem[];
}) {
  const design = useHomeDesignOptional();
  const designMode = design?.designMode ?? false;
  const itemH = design?.layout.quickRail.itemH ?? 88;
  const gap = design?.layout.quickRail.gap ?? 12;
  const title = design?.layout.quickRail.title || titleProp || 'სწრაფი ბმულები';
  const items = design?.layout.quickRail.items?.length
    ? design.layout.quickRail.items
    : itemsProp || [];
  const imageUrls = useRailImageUrls(items);
  const drag = useRailLabelDrag('quickRail', designMode);

  return (
    <aside className="flex w-full flex-col" style={{ gap }} aria-label={title}>
      {items.map((item) => {
        const imageUrl = item.imageId ? imageUrls[item.imageId] : undefined;
        const radius = clampRailRadius(item.borderRadius, RAIL_RADIUS_ROUNDED);
        return (
          <Link
            key={item.id}
            href={item.href || '#'}
            data-rail-item={item.id}
            className="relative block overflow-hidden border transition"
            data-theme-surface
            style={{
              minHeight: itemH,
              borderRadius: radius,
              backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onPointerDown={
              designMode
                ? (e) => {
                    e.stopPropagation();
                    design?.setSelectedId('quickRail');
                    design?.setSelectedRailItemId(item.id);
                  }
                : undefined
            }
            onClick={
              designMode
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    design?.setSelectedId('quickRail');
                    design?.setSelectedRailItemId(item.id);
                  }
                : undefined
            }
          >
            {imageUrl ? (
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10"
                aria-hidden
              />
            ) : (
              <span
                className="pointer-events-none absolute inset-0"
                style={{ backgroundColor: 'var(--theme-surface-bg)' }}
                aria-hidden
              />
            )}
            <RailLabel
              item={item}
              imageUrl={imageUrl}
              designMode={designMode}
              drag={drag}
              showHint
              rail="quickRail"
            />
            {/* Keep min height even with absolute label */}
            <span className="invisible block px-3 py-3 text-sm font-semibold" aria-hidden>
              {item.label}
              {item.hint ? <span className="mt-0.5 block text-[11px]">{item.hint}</span> : null}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
