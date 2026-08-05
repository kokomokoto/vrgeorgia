'use client';

import React from 'react';

import type { FiltersState } from '@/components/Filters';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { useTheme } from '@/components/ThemeProvider';
import {
  DEFAULT_TYPE_PANEL_ITEMS,
  TYPE_PANEL_COUNT_FONT_DEFAULT,
  TYPE_PANEL_ICON_FONT_DEFAULT,
  TYPE_PANEL_LABEL_FONT_DEFAULT,
  TYPE_PANEL_RADIUS_DEFAULT,
  clampFontSize,
  clampRailRadius,
  resolveTypePanelItemsForMode,
  type TypePanelItem,
} from '@/lib/homeDesignLayout';
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

function TypeCoverMedia({ media }: { media?: TypeMedia }) {
  if (!media?.url && !media?.embedUrl) return null;

  if (media.kind === 'video' && media.embedUrl?.includes('youtube.com/embed')) {
    return (
      <iframe
        src={media.embedUrl}
        title=""
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 border-0"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
      />
    );
  }

  if (media.kind === 'video') {
    return (
      <video
        src={media.embedUrl || media.url}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      />
    );
  }

  return null;
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
}: HomeTypePanelProps) {
  const design = useHomeDesignOptional();
  const { activeModeId } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(true);

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

  const renderCards = () =>
    PROPERTY_CATEGORIES.map((cat) => {
      const item = itemById.get(cat.value) || {
        id: cat.value,
        label: '',
        icon: cat.icon,
        borderRadius: TYPE_PANEL_RADIUS_DEFAULT,
      };
      const isFilterSelected = filters.type.includes(cat.value);
      const isDesignSelected = designMode && selectedTypeItemId === cat.value;
      const media = mediaById[cat.value];
      const imageUrl = media?.kind === 'video' ? undefined : media?.url;
      const hasMedia = Boolean(media?.url || media?.embedUrl);
      const radius = clampRailRadius(item.borderRadius, TYPE_PANEL_RADIUS_DEFAULT);
      const labelFontSize = clampFontSize(
        item.labelFontSize,
        TYPE_PANEL_LABEL_FONT_DEFAULT,
        8,
        48
      );
      const countFontSize = clampFontSize(
        item.countFontSize,
        TYPE_PANEL_COUNT_FONT_DEFAULT,
        8,
        32
      );
      const iconFontSize = clampFontSize(
        item.iconFontSize,
        TYPE_PANEL_ICON_FONT_DEFAULT,
        12,
        64
      );
      const displayLabel = item.label.trim() || tr(cat.key, cat.value);

      return (
        <button
          key={cat.value}
          type="button"
          data-type-item={cat.value}
          onPointerDown={
            designMode
              ? (e) => {
                  e.stopPropagation();
                  design?.setSelectedId('typePanel');
                  design?.setSelectedTypeItemId(cat.value);
                }
              : undefined
          }
          onClick={
            designMode
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  design?.setSelectedId('typePanel');
                  design?.setSelectedTypeItemId(cat.value);
                }
              : () => onPatch((prev) => togglePropertyType(prev, cat.value, isFilterSelected))
          }
          className={`relative flex flex-col items-center justify-center overflow-hidden border-2 p-2 transition-all sm:p-3 ${
            designMode ? '' : 'hover:scale-105 hover:shadow-md'
          } ${
            isDesignSelected
              ? 'border-blue-600 ring-2 ring-blue-400/50 dark:border-blue-400'
              : isFilterSelected
                ? 'border-blue-500 bg-blue-50 shadow-md dark:border-amber-500 dark:bg-amber-950/40 dark:shadow-amber-900/20'
                : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-600/50'
          }`}
          style={{
            borderRadius: radius,
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <TypeCoverMedia media={media} />
          {hasMedia ? (
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
              aria-hidden
            />
          ) : null}
          <span className="relative z-[1] mb-0.5 sm:mb-1" style={{ fontSize: iconFontSize }}>
            {hasMedia ? null : item.icon || cat.icon}
          </span>
          <span
            className={`relative z-[1] text-center font-medium leading-tight ${
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
          </span>
          <span
            className={`relative z-[1] mt-0.5 ${
              hasMedia
                ? 'text-white/90 drop-shadow'
                : isFilterSelected && !designMode
                  ? 'text-blue-600 dark:text-amber-500/90'
                  : 'text-slate-400 dark:text-zinc-500'
            }`}
            style={{
              fontSize: countFontSize,
              color: item.countColor || undefined,
            }}
          >
            {categoryCounts[cat.value] || 0}
          </span>
        </button>
      );
    });

  return (
    <div
      className="box-border flex h-full w-full flex-col overflow-visible rounded-xl bg-transparent"
      style={{ padding: pad }}
    >
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
          <div className="grid grid-cols-5" style={{ gap }}>
            {renderCards()}
          </div>
        ) : null}
      </div>

      <div
        className="hidden h-full min-h-0 grid-cols-5 content-stretch md:grid lg:grid-cols-10"
        style={{ gap }}
      >
        {renderCards()}
      </div>
    </div>
  );
}

/** Land status chips — render outside the typePanel Designable box so it is not clipped */
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
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
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                selected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              {tr(item.labelKey, item.value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
