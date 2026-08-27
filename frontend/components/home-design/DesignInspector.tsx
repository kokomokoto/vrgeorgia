'use client';

import React from 'react';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  DESIGNABLE_HINTS,
  DESIGNABLE_LABELS,
  DEFAULT_SEARCH,
  SEARCH_CONTROL_IDS,
  SEARCH_CONTROL_LABELS,
  DEAL_CHIP_IDS,
  DEAL_CHIP_LABELS,
  DEFAULT_DEAL_BAR,
  resolveSearchControl,
  normalizeDealBar,
  HEADER_ITEM_IDS,
  HEADER_ITEM_LABELS,
  HERO_TRANSITIONS,
  RAIL_HINT_FONT_DEFAULT,
  RAIL_LABEL_DEFAULT,
  RAIL_LABEL_FONT_DEFAULT,
  RAIL_RADIUS_CIRCLE,
  RAIL_RADIUS_ROUNDED,
  RAIL_RADIUS_SQUARE,
  TYPE_PANEL_COUNT_FONT_DEFAULT,
  TYPE_PANEL_COUNT_POS_DEFAULT,
  TYPE_PANEL_ICON_FONT_DEFAULT,
  TYPE_PANEL_ICON_POS_DEFAULT,
  TYPE_PANEL_LABEL_FONT_DEFAULT,
  TYPE_PANEL_LABEL_POS_DEFAULT,
  TYPE_PANEL_MEDIA_POS_DEFAULT,
  TYPE_PANEL_MEDIA_SCALE_DEFAULT,
  TYPE_PANEL_RADIUS_DEFAULT,
  clampFontSize,
  clampFontWeight,
  clampMediaScale,
  clampOpacity,
  clampPx,
  clampRailPercent,
  clampRailRadius,
  clampTypeLabelMaxW,
  HEADER_ITEM_GAP_PX_DEFAULT,
  HEADER_ITEM_GAP_PX_MAX,
  clampHeaderItemGapPx,
  headerItemLabelKey,
  resolveHeaderItemNoOverlap,
  resolveHeaderItemPos,
  spreadHeaderItemPositions,
  resolveRailItemsForMode,
  resolveTypePanelItemsForMode,
  isRailSectionHiddenForMode,
  withRailSectionHidden,
  type DesignableId,
  type HeaderItemId,
  type HeaderLayout,
  type HeroTransition,
  type RailItem,
  type SearchLayout,
  type HeaderItemStyle,
  type TypePanelItem,
} from '@/lib/homeDesignLayout';
import {
  resolveToggleIconEmoji,
  THEME_BASE_TONE_ICONS,
  THEME_BASE_TONE_LABELS,
  type ThemeBaseTone,
  type ThemeModeDef,
} from '@/lib/themeModes';
import { hexToRgba, parseColorWithOpacity, MAP_TILE_OPTIONS } from '@/lib/themePalettes';
import type { MapTileStyle, ThemePalette } from '@/lib/themePalettes';
import {
  EMPTY_SITE_SOCIAL_LINKS,
  SITE_SOCIAL_FIELD_LABELS,
  SITE_SOCIAL_NETWORKS,
  SITE_SOCIAL_PLACEHOLDERS,
  siteSocialChatUrl,
  type SiteSocialLinks,
} from '@/lib/siteSocialLinks';
import { useTheme } from '@/components/ThemeProvider';
import { useIsDesignDesktop } from '@/lib/useIsDesignDesktop';
import {
  MAX_HERO_IMAGES_PER_MODE,
  resolveHeroImageUrls,
  revokeHeroUrls,
} from '@/lib/heroImageStorage';
import {
  externalMediaDisplayUrl,
  mediaKindLabel,
  parseExternalMediaId,
  type DesignMediaKind,
} from '@/lib/designMedia';
import { headerOverlapOptsForEditor, queryHeaderCanvas, seedVisibleHeaderPositions } from '@/lib/headerCanvasMeasure';

const SELECT_ORDER: DesignableId[] = [
  'header',
  'hero',
  'heroText',
  'dealBar',
  'search',
  'typePanel',
  'serviceRail',
  'map',
  'listings',
  'quickRail',
  'theme',
  'social',
];

const INSPECTOR_UI_KEY = 'vhome-design-inspector-ui-v2';
const INSPECTOR_UI_KEY_LEGACY = 'vhome-design-inspector-ui-v1';
const INSPECTOR_DEFAULT_W = 340;
const INSPECTOR_DEFAULT_H = 560;
const INSPECTOR_MIN_W = 280;
const INSPECTOR_MIN_H = 240;
const INSPECTOR_MAX_W = 720;

type InspectorUiState = {
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
};

type InspectorResizeEdge = 'e' | 's' | 'se';

function defaultInspectorPos(w = INSPECTOR_DEFAULT_W): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 24, y: 80 };
  return {
    x: Math.max(8, window.innerWidth - w - 16),
    y: Math.max(8, window.innerHeight - Math.min(INSPECTOR_DEFAULT_H, 480) - 16),
  };
}

function clampInspectorSize(
  w: number,
  h: number,
  collapsed: boolean
): { w: number; h: number } {
  if (typeof window === 'undefined') {
    return {
      w: Math.max(INSPECTOR_MIN_W, Math.min(INSPECTOR_MAX_W, Math.round(w))),
      h: collapsed ? 48 : Math.max(INSPECTOR_MIN_H, Math.round(h)),
    };
  }
  const viewportW = Math.max(0, window.innerWidth - 16);
  const minW = Math.min(INSPECTOR_MIN_W, Math.max(200, viewportW));
  const maxW = Math.max(minW, Math.min(INSPECTOR_MAX_W, viewportW));
  const maxH = Math.max(180, Math.floor(window.innerHeight * 0.92));
  const minH = Math.min(INSPECTOR_MIN_H, maxH);
  return {
    w: Math.max(minW, Math.min(maxW, Math.round(w))),
    h: collapsed ? 48 : Math.max(minH, Math.min(maxH, Math.round(h))),
  };
}

function clampInspectorUi(state: InspectorUiState): InspectorUiState {
  const size = clampInspectorSize(state.w, state.h, state.collapsed);
  if (typeof window === 'undefined') {
    return { ...state, ...size };
  }
  const maxX = Math.max(8, window.innerWidth - size.w - 8);
  const maxY = Math.max(8, window.innerHeight - Math.min(size.h, 120) - 8);
  return {
    collapsed: state.collapsed,
    w: size.w,
    h: size.h,
    x: Math.min(maxX, Math.max(8, Math.round(state.x))),
    y: Math.min(maxY, Math.max(8, Math.round(state.y))),
  };
}

function loadInspectorUi(): InspectorUiState {
  const fallback: InspectorUiState = {
    ...defaultInspectorPos(),
    w: INSPECTOR_DEFAULT_W,
    h: INSPECTOR_DEFAULT_H,
    collapsed: false,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw =
      window.localStorage.getItem(INSPECTOR_UI_KEY) ||
      window.localStorage.getItem(INSPECTOR_UI_KEY_LEGACY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<InspectorUiState>;
    return clampInspectorUi({
      x: typeof parsed.x === 'number' ? parsed.x : fallback.x,
      y: typeof parsed.y === 'number' ? parsed.y : fallback.y,
      w: typeof parsed.w === 'number' ? parsed.w : INSPECTOR_DEFAULT_W,
      h: typeof parsed.h === 'number' ? parsed.h : INSPECTOR_DEFAULT_H,
      collapsed: Boolean(parsed.collapsed),
    });
  } catch {
    return fallback;
  }
}

/** Floating inspector — only visible in Design Mode on the home page */
export function DesignInspector() {
  const ctx = useHomeDesignOptional();
  const isDesktopLayout = useIsDesignDesktop();
  const [saveFlash, setSaveFlash] = React.useState(false);
  const [ui, setUi] = React.useState<InspectorUiState>(() => loadInspectorUi());
  const [hydratedUi, setHydratedUi] = React.useState(false);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const resizeRef = React.useRef<{
    pointerId: number;
    edge: InspectorResizeEdge;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const { activeModeId, modeInfos, setActiveModeId } = useTheme();
  const activeModeLabel =
    modeInfos.find((m) => m.id === activeModeId)?.label || activeModeId || 'დღის რეჟიმი';
  const [showDangerMenu, setShowDangerMenu] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [presetBusy, setPresetBusy] = React.useState(false);

  React.useEffect(() => {
    setUi(loadInspectorUi());
    setHydratedUi(true);
  }, []);

  React.useEffect(() => {
    if (!hydratedUi) return;
    try {
      window.localStorage.setItem(INSPECTOR_UI_KEY, JSON.stringify(ui));
    } catch {
      /* ignore quota */
    }
  }, [ui, hydratedUi]);

  React.useEffect(() => {
    const onResize = () => {
      setUi((prev) => clampInspectorUi(prev));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Hooks must run before any early return (Rules of Hooks).
  const selectedId = ctx?.selectedId ?? null;
  const selectedHeaderItemId = ctx?.selectedHeaderItemId ?? null;
  const selectedRailItemId = ctx?.selectedRailItemId ?? null;
  const selectedTypeItemId = ctx?.selectedTypeItemId ?? null;
  const activeEditParams = ctx?.activeEditParams ?? [];

  React.useEffect(() => {
    if (!ctx?.designMode || !ctx.canDesignMode) return;
    if (!selectedId) return;
    setUi((prev) => (prev.collapsed ? { ...prev, collapsed: false } : prev));
  }, [
    ctx?.designMode,
    ctx?.canDesignMode,
    selectedId,
    selectedHeaderItemId,
    selectedRailItemId,
    selectedTypeItemId,
  ]);

  React.useEffect(() => {
    if (!ctx?.designMode || !ctx.canDesignMode) return;
    if (!selectedId || ui.collapsed) return;
    const t = window.setTimeout(() => {
      const body = bodyRef.current;
      if (!body) return;
      if (activeEditParams.length > 0) {
        const key = activeEditParams[0];
        const el = body.querySelector<HTMLElement>(`[data-edit-param="${key}"]`);
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return;
        }
      }
      const focused = body.querySelector<HTMLElement>('[data-inspector-focused="true"]');
      if (focused) {
        focused.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }
      body.scrollTo({ top: 0, behavior: 'smooth' });
    }, 40);
    return () => window.clearTimeout(t);
  }, [
    ctx?.designMode,
    ctx?.canDesignMode,
    selectedId,
    selectedHeaderItemId,
    selectedRailItemId,
    selectedTypeItemId,
    activeEditParams,
    ui.collapsed,
  ]);

  const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopLayout) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, label')) return;
    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: ui.x,
      origY: ui.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    setUi((prev) =>
      clampInspectorUi({
        ...prev,
        x: d.origX + dx,
        y: d.origY + dy,
      })
    );
  };

  const onTitlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onResizePointerDown = (edge: InspectorResizeEdge) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      pointerId: e.pointerId,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origW: ui.w,
      origH: ui.h,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    setUi((prev) => {
      const nextW = r.edge === 's' ? prev.w : r.origW + dx;
      const nextH = r.edge === 'e' ? prev.h : r.origH + dy;
      return clampInspectorUi({
        ...prev,
        w: nextW,
        h: nextH,
        collapsed: false,
      });
    });
  };

  const onResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r || r.pointerId !== e.pointerId) return;
    resizeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  if (!ctx?.designMode || !ctx.canDesignMode) return null;

  const {
    layout,
    setSelectedId,
    setSelectedRailItemId,
    setSelectedTypeItemId,
    setSelectedHeaderItemId,
    updateBox,
    updateSearch,
    updateHero,
    updateHeader,
    updateHeroText,
    addHeroImages,
    addHeroMediaUrl,
    removeHeroImage,
    moveHeroImage,
    toggleHeroRotationImage,
    toggleHeroModeEnabled,
    addThemeMode,
    removeThemeMode,
    updateThemeMode,
    updateThemePalette,
    resetThemePalette,
    setHeaderBgImage,
    setHeaderBgMediaUrl,
    removeHeaderBgMedia,
    setThemeToggleIconImage,
    setThemeToggleIconMediaUrl,
    removeThemeToggleIconMedia,
    updateServiceRail,
    updateQuickRail,
    updateSocialLinks,
    addRailItem,
    removeRailItem,
    updateRailItem,
    setRailItemImage,
    setRailItemMediaUrl,
    removeRailItemImage,
    updateTypePanelItem,
    setTypePanelItemImage,
    setTypePanelItemMediaUrl,
    removeTypePanelItemImage,
    resetLayout,
    resetToFactoryDefault,
    designPresets,
    designPresetsMax,
    designPresetsLoading,
    saveCurrentAsPreset,
    applyDesignPreset,
    overwriteDesignPreset,
    removeDesignPreset,
    setDesignMode,
    isDirty,
    saving,
    saveDesignChanges,
    discardDesignChanges,
    canUndo,
    canRedo,
    undo,
    redo,
  } = ctx;

  const onSave = async () => {
    await saveDesignChanges();
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1600);
  };

  const collapsed = ui.collapsed;

  const typeItemsForMode = resolveTypePanelItemsForMode(
    layout.typePanel.items || [],
    activeModeId || 'day'
  );
  const serviceItemsForMode = resolveRailItemsForMode(
    layout.serviceRail.items,
    activeModeId || 'day'
  );
  const quickItemsForMode = resolveRailItemsForMode(
    layout.quickRail.items,
    activeModeId || 'day'
  );
  const editingLabel =
    selectedId === 'header' && selectedHeaderItemId
      ? `${DESIGNABLE_LABELS.header} / ${HEADER_ITEM_LABELS[selectedHeaderItemId]}`
      : selectedId === 'typePanel' && selectedTypeItemId
        ? `${DESIGNABLE_LABELS.typePanel} / ${
            typeItemsForMode.find((it) => it.id === selectedTypeItemId)?.label ||
            selectedTypeItemId
          }`
        : selectedId
          ? DESIGNABLE_LABELS[selectedId]
          : null;

  const mobileDock = !isDesktopLayout;

  return (
    <div
      data-design-inspector
      className="fixed z-[400] flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
      style={
        mobileDock
          ? {
              left: 8,
              right: 8,
              bottom: 8,
              top: 'auto',
              width: 'auto',
              height: collapsed ? 'auto' : 'min(46vh, 420px)',
              maxHeight: '46vh',
            }
          : {
              left: ui.x,
              top: ui.y,
              width: ui.w,
              height: collapsed ? 'auto' : ui.h,
            }
      }
    >
      <div
        className="flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-2 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-950"
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onPointerCancel={onTitlePointerUp}
        title="გადაათრიე ფანჯარა"
      >
        <span className="text-[11px] text-slate-400" aria-hidden>
          ⋮⋮
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-bold text-slate-800 dark:text-zinc-100">
              რედაქტირება
            </div>
            {isDirty ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                შეუნახავი
              </span>
            ) : null}
          </div>
          {collapsed && editingLabel ? (
            <div className="truncate text-[10px] text-slate-500 dark:text-zinc-400">
              {editingLabel}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setUi((prev) => ({ ...prev, collapsed: !prev.collapsed }))}
          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title={collapsed ? 'გაშლა' : 'ჩაკეცვა'}
          aria-label={collapsed ? 'გაშლა' : 'ჩაკეცვა'}
        >
          {collapsed ? '▢' : '—'}
        </button>
        <button
          type="button"
          onClick={() => setDesignMode(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      {collapsed ? null : (
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={!isDirty}
              className="flex-[1.6] rounded-md bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              title="გამოქვეყნება ყველა ბრაუზერზე (Ctrl+S)"
            >
              {saveFlash ? '✓ გამოქვეყნდა' : saving ? 'იგზავნება…' : 'შენახვა'}
            </button>
            <button
              type="button"
              onClick={() => void discardDesignChanges()}
              disabled={!isDirty}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:enabled:hover:bg-zinc-800"
              title="ცვლილებების გაუქმება"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200"
              title="უკან (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200"
              title="წინ (Ctrl+Y)"
            >
              ↪
            </button>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                ბლოკი
              </span>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                value={selectedId || ''}
                onChange={(e) => {
                  const id = e.target.value as DesignableId | '';
                  if (!id) {
                    setSelectedId(null);
                    return;
                  }
                  setSelectedId(id);
                  if (id === 'header') setSelectedHeaderItemId(null);
                  if (id === 'serviceRail' || id === 'quickRail') setSelectedRailItemId(null);
                  if (id === 'typePanel') setSelectedTypeItemId(null);
                }}
              >
                <option value="">აირჩიე ან დააკლიკე…</option>
                {SELECT_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {DESIGNABLE_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                რეჟიმი
              </span>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-medium text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                value={activeModeId || modeInfos[0]?.id || 'day'}
                onChange={(e) => setActiveModeId(e.target.value)}
              >
                {modeInfos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mb-3 text-[10px] leading-snug text-slate-400">
            ცვლილებები ინახება რეჟიმში: <strong className="text-slate-600 dark:text-zinc-300">{activeModeLabel}</strong>
          </p>

          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950/60">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              დეფაულტები
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={resetToFactoryDefault}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                title="კოდის საწყისი ვიზუალი — ყველაფერი, მათ შორის რეჟიმები"
              >
                Default
              </button>
              <button
                type="button"
                onClick={resetLayout}
                className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
                title="მხოლოდ პოზიციები და ზომები — ჩამქრალი რჩება ჩამქრალი"
              >
                პოზიციები ↺
              </button>
            </div>
            <div className="mb-1.5 flex gap-1">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={48}
                placeholder="ახალი დეფაულტის სახელი…"
                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                disabled={presetBusy || !presetName.trim() || designPresets.length >= designPresetsMax}
                onClick={() => {
                  void (async () => {
                    setPresetBusy(true);
                    const ok = await saveCurrentAsPreset(presetName);
                    setPresetBusy(false);
                    if (ok) setPresetName('');
                  })();
                }}
                className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="მიმდინარე ვიზუალი შეინახე როგორც დეფაულტი"
              >
                შენახვა
              </button>
            </div>
            <p className="mb-1.5 text-[9px] leading-snug text-slate-400">
              შეგიძლია რამდენიმე დეფაულტი ({designPresets.length}/{designPresetsMax}). გამოყენების შემდეგ დააჭირე
              „შენახვა“ გამოქვეყნებისთვის.
            </p>
            {designPresetsLoading ? (
              <p className="text-[10px] text-slate-400">იტვირთება…</p>
            ) : designPresets.length === 0 ? (
              <p className="text-[10px] text-slate-400">ჯერ არც ერთი შენახული დეფაულტი არაა.</p>
            ) : (
              <ul className="max-h-36 space-y-1 overflow-y-auto">
                {designPresets.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800 dark:text-zinc-100" title={p.name}>
                      {p.name}
                    </span>
                    <button
                      type="button"
                      disabled={presetBusy}
                      onClick={() => {
                        void (async () => {
                          setPresetBusy(true);
                          await applyDesignPreset(p.id);
                          setPresetBusy(false);
                        })();
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                    >
                      გამოყენება
                    </button>
                    <button
                      type="button"
                      disabled={presetBusy}
                      onClick={() => {
                        void (async () => {
                          setPresetBusy(true);
                          await overwriteDesignPreset(p.id);
                          setPresetBusy(false);
                        })();
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="განაახლე ეს დეფაულტი მიმდინარე ვიზუალით"
                    >
                      განახლება
                    </button>
                    <button
                      type="button"
                      disabled={presetBusy}
                      onClick={() => {
                        void (async () => {
                          setPresetBusy(true);
                          await removeDesignPreset(p.id);
                          setPresetBusy(false);
                        })();
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {editingLabel ? (
            <div
              data-inspector-focused="true"
              className="mb-3 rounded-lg border border-blue-400 bg-blue-50 px-2.5 py-2 dark:border-blue-500 dark:bg-blue-950/50"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                მონიშნული ეკრანზე
              </div>
              <div className="mt-0.5 text-[13px] font-bold text-blue-900 dark:text-blue-100">
                {editingLabel}
              </div>
              {activeEditParams.length > 0 ? (
                <div className="mt-1 text-[11px] font-medium text-blue-800 dark:text-blue-200">
                  იცვლება:{' '}
                  {activeEditParams
                    .map((p) =>
                      p === 'posX'
                        ? 'X (%)'
                        : p === 'posY'
                          ? 'Y (%)'
                          : p === 'headerH'
                            ? 'სიმაღლე (H)'
                            : p === 'itemW'
                              ? 'Item W'
                              : p === 'itemH'
                                ? 'Item H'
                                : p === 'mobileX'
                                  ? 'Mobile X'
                                  : p === 'mobileY'
                                    ? 'Mobile Y'
                                    : p === 'labelX'
                                      ? 'Label X'
                                      : p === 'labelY'
                                        ? 'Label Y'
                                        : p === 'countX'
                                          ? 'რაოდენობა X'
                                          : p === 'countY'
                                            ? 'რაოდენობა Y'
                                            : p === 'iconX'
                                              ? 'იკონი X'
                                              : p === 'iconY'
                                                ? 'იკონი Y'
                                                : p === 'mediaX'
                                                  ? 'ფოტო X'
                                                  : p === 'mediaY'
                                                    ? 'ფოტო Y'
                                                    : p === 'mediaScale'
                                                      ? 'ფოტოს ზომა'
                                        : p.toUpperCase()
                    )
                    .join(' · ')}
                </div>
              ) : (
                <div className="mt-1 text-[10px] text-blue-700/80 dark:text-blue-300/80">
                  ქვემოთ გამოჩნდება ამ ბლოკის პარამეტრები.
                </div>
              )}
            </div>
          ) : null}

          {!selectedId ? (
            <p className="mb-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-3 text-center text-[11px] text-slate-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
              აირჩიე ბლოკი ზემოთ ან დააკლიკე გვერდზე.
            </p>
          ) : null}

      {selectedId === 'header' ? (
        <HeaderEditor
          header={layout.header}
          modes={layout.themeModes}
          selectedItemId={selectedHeaderItemId}
          onSelectItem={setSelectedHeaderItemId}
          onUpdate={updateHeader}
          onUpdatePalette={updateThemePalette}
          onResetPalette={resetThemePalette}
          onSetBgImage={setHeaderBgImage}
          onSetBgMediaUrl={setHeaderBgMediaUrl}
          onRemoveBgMedia={removeHeaderBgMedia}
        />
      ) : null}

      {selectedId === 'social' ? (
        <SocialLinksEditor
          links={layout.socialLinks ?? EMPTY_SITE_SOCIAL_LINKS}
          onChange={updateSocialLinks}
        />
      ) : null}

      {selectedId === 'theme' ? (
        <ThemeEditor
          modes={layout.themeModes}
          onAddMode={() => addThemeMode(layout.themeModes.some((mode) => mode.id === activeModeId) ? activeModeId : layout.themeModes[0]?.id)}
          onRemoveMode={removeThemeMode}
          onUpdateMode={updateThemeMode}
          onUpdatePalette={updateThemePalette}
          onResetPalette={resetThemePalette}
          onToggleModeEnabled={toggleHeroModeEnabled}
          onSetToggleIconImage={setThemeToggleIconImage}
          onSetToggleIconMediaUrl={setThemeToggleIconMediaUrl}
          onRemoveToggleIconMedia={removeThemeToggleIconMedia}
        />
      ) : null}

      {selectedId === 'hero' ? (
        <HeroEditor
          hero={layout.hero}
          modes={layout.themeModes}
          onUpdate={updateHero}
          onAdd={addHeroImages}
          onAddUrl={addHeroMediaUrl}
          onRemove={removeHeroImage}
          onMove={moveHeroImage}
          onToggleRotation={toggleHeroRotationImage}
          onToggleModeEnabled={toggleHeroModeEnabled}
          onAddMode={() => addThemeMode()}
          onRemoveMode={removeThemeMode}
          onUpdateMode={updateThemeMode}
        />
      ) : null}

      {selectedId === 'heroText' ? (
        <div className="space-y-3">
          <NumGrid
            values={{
              x: layout.heroText.x,
              y: layout.heroText.y,
              w: layout.heroText.w,
              h: layout.heroText.h,
            }}
            onChange={(patch) => updateBox('heroText', patch)}
          />
          <LayerOpacityField
            value={layout.heroText.opacity}
            onChange={(opacity) => updateHeroText({ opacity })}
          />
          <div className="grid grid-cols-2 gap-2">
              <NumField
                label="ტელეფონი X"
                value={layout.heroText.mobileX ?? 16}
                min={-120}
                max={360}
                paramKey="mobileX"
                onCommit={(mobileX) => updateHeroText({ mobileX })}
              />
              <NumField
                label="ტელეფონი Y"
                value={layout.heroText.mobileY ?? 16}
                min={-80}
                max={520}
                paramKey="mobileY"
                onCommit={(mobileY) => updateHeroText({ mobileY })}
              />
          </div>
          <TextField
            label="მთავარი სათაური"
            value={layout.heroText.title ?? ''}
            onCommit={(title) => updateHeroText({ title })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="სათაურის ზომა"
              value={layout.heroText.titleFontSize}
              min={12}
              max={96}
              onCommit={(titleFontSize) => updateHeroText({ titleFontSize })}
            />
            <ColorField
              label="სათაურის ფერი"
              value={layout.heroText.titleColor}
              onChange={(titleColor) => updateHeroText({ titleColor })}
            />
          </div>
          <TextAreaField
            label="ქვესათაური"
            value={layout.heroText.subtitle ?? ''}
            onCommit={(subtitle) => updateHeroText({ subtitle })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="ქვესათაურის ზომა"
              value={layout.heroText.subtitleFontSize}
              min={10}
              max={48}
              onCommit={(subtitleFontSize) => updateHeroText({ subtitleFontSize })}
            />
            <ColorField
              label="ქვესათაურის ფერი"
              value={layout.heroText.subtitleColor}
              onChange={(subtitleColor) => updateHeroText({ subtitleColor })}
            />
          </div>
        </div>
      ) : null}

          {selectedId === 'typePanel' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="X"
                  value={layout.typePanel.x}
                  onCommit={(x) => updateBox('typePanel', { x })}
                />
                <NumField
                  label="Y"
                  value={layout.typePanel.y}
                  onCommit={(y) => updateBox('typePanel', { y })}
                />
                <NumField
                  label="ჩარჩოს სიგანე (W)"
                  value={layout.typePanel.w}
                  min={280}
                  onCommit={(w) => updateBox('typePanel', { w })}
                />
                <NumField
                  label="ჩარჩოს სიმაღლე (H)"
                  value={layout.typePanel.h}
                  min={80}
                  onCommit={(h) => updateBox('typePanel', { h })}
                />
                <NumField
                  label="შიდა ზღვარი (pad)"
                  value={layout.typePanel.pad}
                  min={0}
                  max={48}
                  onCommit={(pad) => updateBox('typePanel', { pad })}
                />
                <NumField
                  label="ბარათების დაშორება (gap)"
                  value={layout.typePanel.gap}
                  min={0}
                  max={40}
                  onCommit={(gap) => updateBox('typePanel', { gap })}
                />
                <NumField
                  label="ტელეფონი X"
                  value={layout.typePanel.mobileX ?? 0}
                  min={-24}
                  max={24}
                  paramKey="mobileX"
                  onCommit={(mobileX) => updateBox('typePanel', { mobileX })}
                />
                <NumField
                  label="ტელეფონი Y"
                  value={layout.typePanel.mobileY ?? 0}
                  min={-48}
                  max={64}
                  paramKey="mobileY"
                  onCommit={(mobileY) => updateBox('typePanel', { mobileY })}
                />
              </div>
              <LayerOpacityField
                value={layout.typePanel.opacity}
                onChange={(opacity) => updateBox('typePanel', { opacity })}
              />
              <p className="text-[11px] leading-snug text-slate-500 dark:text-zinc-400">
                თუ მონიშვნისას/hover-ზე ლურჯი საზღვარი იჭრება — გაზარდე H ან pad. ტელეფონზე გადაათრიე პანელი.
              </p>
              <TypePanelItemsEditor
                items={typeItemsForMode}
                focusItemId={selectedTypeItemId}
                onFocusItem={setSelectedTypeItemId}
                onUpdate={updateTypePanelItem}
                onSetImage={setTypePanelItemImage}
                onSetMediaUrl={setTypePanelItemMediaUrl}
                onRemoveImage={removeTypePanelItemImage}
              />
            </div>
          ) : null}

          {selectedId === 'search' ? (
            <SearchEditor search={layout.search} onUpdate={updateSearch} />
          ) : null}

          {selectedId === 'dealBar' ? (
            <DealBarChipsEditor />
          ) : null}

          {selectedId === 'map' || selectedId === 'dealBar' || selectedId === 'listings' ? (
            <div className="space-y-2">
              <NumGrid
                values={{
                  x: layout[selectedId].x,
                  y: layout[selectedId].y,
                  w: layout[selectedId].w,
                  h: layout[selectedId].h,
                }}
                onChange={(patch) => updateBox(selectedId, patch)}
              />
              <LayerOpacityField
                value={layout[selectedId].opacity}
                onChange={(opacity) => updateBox(selectedId, { opacity })}
              />
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="ტელეფონი X"
                  value={layout[selectedId].mobileX ?? 0}
                  min={-24}
                  max={24}
                  paramKey="mobileX"
                  onCommit={(mobileX) => updateBox(selectedId, { mobileX })}
                />
                <NumField
                  label="ტელეფონი Y"
                  value={layout[selectedId].mobileY ?? 0}
                  min={-48}
                  max={64}
                  paramKey="mobileY"
                  onCommit={(mobileY) => updateBox(selectedId, { mobileY })}
                />
              </div>
              <p className="text-[10px] leading-snug text-slate-500 dark:text-zinc-400">
                ტელეფონზე გადაათრიე ბლოკი ან აქ ჩაწერე. უარყოფითი Y = უფრო მაღლა / ნაკლები დაშორება.
              </p>
            </div>
          ) : null}

      {selectedId === 'serviceRail' ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!isRailSectionHiddenForMode(layout.serviceRail, activeModeId || 'day')}
              onChange={(e) => {
                const next = withRailSectionHidden(
                  layout.serviceRail.hiddenModeIds,
                  activeModeId || 'day',
                  !e.target.checked
                );
                updateServiceRail({ hiddenModeIds: next });
              }}
            />
            <span className="text-[11px] leading-snug text-slate-700 dark:text-zinc-200">
              <strong>განყოფილება ჩანს</strong> რეჟიმში: {activeModeLabel}
              <span className="mt-0.5 block text-[10px] text-slate-500">
                გამორთე — მომხმარებელს ამ რეჟიმში სერვისის წრეები არ ეჩვენება. სხვა რეჟიმებს არ ეხება.
              </span>
            </span>
          </label>
          <TextField
            label="განყოფილების სათაური"
            value={layout.serviceRail.title}
            onCommit={(title) => updateServiceRail({ title })}
          />
          <InspectorFold title="პოზიცია / ზომა">
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={layout.serviceRail.x} paramKey="x" onCommit={(x) => updateServiceRail({ x })} />
            <NumField label="Y" value={layout.serviceRail.y} paramKey="y" onCommit={(y) => updateServiceRail({ y })} />
            <NumField
              label="სიგანე (W)"
              value={layout.serviceRail.itemW}
              min={40}
              paramKey="itemW"
              onCommit={(itemW) => updateServiceRail({ itemW })}
            />
            <NumField
              label="სიმაღლე (H)"
              value={layout.serviceRail.itemH}
              min={40}
              paramKey="itemH"
              onCommit={(itemH) => updateServiceRail({ itemH })}
            />
            <NumField
              label="Gap"
              value={layout.serviceRail.gap}
              min={0}
              onCommit={(gap) => updateServiceRail({ gap })}
            />
          </div>
          </InspectorFold>
          <LayerOpacityField
            value={layout.serviceRail.opacity}
            onChange={(opacity) => updateServiceRail({ opacity })}
          />
          <p className="text-[10px] leading-snug text-slate-400">
            {DESIGNABLE_HINTS.serviceRail}
          </p>
          <RailItemsEditor
            items={serviceItemsForMode}
            focusItemId={selectedRailItemId}
            onFocusItem={setSelectedRailItemId}
            modeLabel={activeModeLabel}
            onAdd={() => addRailItem('serviceRail')}
            onRemove={(id) => removeRailItem('serviceRail', id)}
            onUpdate={(id, patch) => updateRailItem('serviceRail', id, patch)}
            onSetImage={(id, file) => setRailItemImage('serviceRail', id, file)}
            onSetMediaUrl={(id, url) => setRailItemMediaUrl('serviceRail', id, url)}
            onRemoveImage={(id) => removeRailItemImage('serviceRail', id)}
            defaultRadius={RAIL_RADIUS_CIRCLE}
            circleRadiusHint={Math.ceil(Math.min(layout.serviceRail.itemW, layout.serviceRail.itemH) / 2)}
            showHint={false}
          />
        </div>
      ) : null}

      {selectedId === 'quickRail' ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!isRailSectionHiddenForMode(layout.quickRail, activeModeId || 'day')}
              onChange={(e) => {
                const next = withRailSectionHidden(
                  layout.quickRail.hiddenModeIds,
                  activeModeId || 'day',
                  !e.target.checked
                );
                updateQuickRail({ hiddenModeIds: next });
              }}
            />
            <span className="text-[11px] leading-snug text-slate-700 dark:text-zinc-200">
              <strong>განყოფილება ჩანს</strong> რეჟიმში: {activeModeLabel}
              <span className="mt-0.5 block text-[10px] text-slate-500">
                გამორთე — მომხმარებელს ამ რეჟიმში სწრაფი ბმულები არ ეჩვენება. სხვა რეჟიმებს არ ეხება.
              </span>
            </span>
          </label>
          <TextField
            label="განყოფილების სათაური"
            value={layout.quickRail.title}
            onCommit={(title) => updateQuickRail({ title })}
          />
          <InspectorFold title="პოზიცია / ზომა">
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={layout.quickRail.x} paramKey="x" onCommit={(x) => updateQuickRail({ x })} />
            <NumField label="Y" value={layout.quickRail.y} paramKey="y" onCommit={(y) => updateQuickRail({ y })} />
            <NumField
              label="სიგანე (W)"
              value={layout.quickRail.w}
              min={80}
              paramKey="itemW"
              onCommit={(w) => updateQuickRail({ w })}
            />
            <NumField
              label="ბარათის H"
              value={layout.quickRail.itemH}
              min={40}
              paramKey="itemH"
              onCommit={(itemH) => updateQuickRail({ itemH })}
            />
            <NumField
              label="Gap"
              value={layout.quickRail.gap}
              min={0}
              onCommit={(gap) => updateQuickRail({ gap })}
            />
          </div>
          </InspectorFold>
          <LayerOpacityField
            value={layout.quickRail.opacity}
            onChange={(opacity) => updateQuickRail({ opacity })}
          />
          <p className="text-[10px] leading-snug text-slate-400">
            {DESIGNABLE_HINTS.quickRail}
          </p>
          <RailItemsEditor
            items={quickItemsForMode}
            focusItemId={selectedRailItemId}
            onFocusItem={setSelectedRailItemId}
            modeLabel={activeModeLabel}
            onAdd={() => addRailItem('quickRail')}
            onRemove={(id) => removeRailItem('quickRail', id)}
            onUpdate={(id, patch) => updateRailItem('quickRail', id, patch)}
            onSetImage={(id, file) => setRailItemImage('quickRail', id, file)}
            onSetMediaUrl={(id, url) => setRailItemMediaUrl('quickRail', id, url)}
            onRemoveImage={(id) => removeRailItemImage('quickRail', id)}
            defaultRadius={RAIL_RADIUS_ROUNDED}
            circleRadiusHint={Math.ceil(Math.min(layout.quickRail.w, layout.quickRail.itemH) / 2)}
            showHint
          />
        </div>
      ) : null}

      <div className="mt-4 border-t border-slate-200 pt-2 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setShowDangerMenu((v) => !v)}
          className="w-full rounded-md px-2 py-1 text-left text-[10px] font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          {showDangerMenu ? '▾' : '▸'} სხვა · საფრთხის ზონა
        </button>
        {showDangerMenu ? (
          <div className="mt-1 space-y-1.5">
            <p className="text-[10px] leading-snug text-slate-400">
              დეფაულტები და Default ზემოთაა. აქ იგივე პოზიციების ↺აა სწრაფი წვდომისთვის.
              პოზიციები ჩამქრალ ელემენტებს აღარ რთავს.
            </p>
            <button
              type="button"
              onClick={resetLayout}
              className="w-full rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
            >
              მხოლოდ პოზიციები ნაგულისხმევზე
            </button>
          </div>
        ) : null}
      </div>
        </div>
      )}

      {/* Resize: right edge (width) */}
      {!mobileDock ? (
      <div
        className="absolute bottom-3 right-0 top-10 z-50 w-2 cursor-ew-resize touch-none"
        onPointerDown={onResizePointerDown('e')}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        title="სიგანის შეცვლა"
        aria-label="სიგანის შეცვლა"
      />
      ) : null}
      {!mobileDock && !collapsed ? (
        <>
          {/* bottom edge (height) */}
          <div
            className="absolute bottom-0 left-3 right-3 z-50 h-2 cursor-ns-resize touch-none"
            onPointerDown={onResizePointerDown('s')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
            title="სიმაღლის შეცვლა"
            aria-label="სიმაღლის შეცვლა"
          />
          {/* SE corner */}
          <div
            className="absolute bottom-0 right-0 z-50 flex h-4 w-4 cursor-se-resize touch-none items-end justify-end rounded-br-xl p-0.5"
            onPointerDown={onResizePointerDown('se')}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
            title="ზომის შეცვლა"
            aria-label="ზომის შეცვლა"
          >
            <span
              className="block h-2.5 w-2.5 rounded-sm border-b-2 border-r-2 border-slate-400 dark:border-zinc-500"
              aria-hidden
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function HeroEditor({
  hero,
  modes,
  onUpdate,
  onAdd,
  onAddUrl,
  onRemove,
  onMove,
  onToggleRotation,
  onToggleModeEnabled,
  onAddMode,
  onRemoveMode,
  onUpdateMode,
}: {
  hero: {
    h: number;
    mobileH?: number;
    mobileStackGap?: number;
    intervalSec: number;
    transition: HeroTransition;
    opacity?: number;
  };
  modes: ThemeModeDef[];
  onUpdate: (patch: {
    h?: number;
    mobileH?: number;
    mobileStackGap?: number;
    intervalSec?: number;
    transition?: HeroTransition;
    opacity?: number;
  }) => void;
  onAdd: (modeId: string, files: File[]) => Promise<void>;
  onAddUrl: (modeId: string, url: string) => boolean;
  onRemove: (modeId: string, id: string) => Promise<void>;
  onMove: (modeId: string, id: string, dir: -1 | 1) => void;
  onToggleRotation: (modeId: string, id: string) => void;
  onToggleModeEnabled: (modeId: string) => void;
  onAddMode: () => void;
  onRemoveMode: (modeId: string) => boolean;
  onUpdateMode: (
    modeId: string,
    patch: Partial<Pick<ThemeModeDef, 'label' | 'baseTone' | 'enabled'>>
  ) => void;
}) {
  const { setActiveModeId } = useTheme();
  const [expandedModes, setExpandedModes] = React.useState<Record<string, boolean>>({});
  const [uploading, setUploading] = React.useState(false);
  const [urlDraftByMode, setUrlDraftByMode] = React.useState<Record<string, string>>({});
  const [urlErrorByMode, setUrlErrorByMode] = React.useState<Record<string, string>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);
  const uploadModeRef = React.useRef('');

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const modeId = uploadModeRef.current;
    if (!modeId) return;
    setUploading(true);
    try {
      await onAdd(modeId, Array.from(list));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmitUrl = (modeId: string) => {
    const ok = onAddUrl(modeId, urlDraftByMode[modeId] || '');
    if (!ok) {
      setUrlErrorByMode((prev) => ({
        ...prev,
        [modeId]: 'ჩაწერე სწორი ლინკი (ფოტო, GIF ან ვიდეო / YouTube)',
      }));
      return;
    }
    setUrlDraftByMode((prev) => ({ ...prev, [modeId]: '' }));
    setUrlErrorByMode((prev) => {
      const next = { ...prev };
      delete next[modeId];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-2.5 dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            ტელეფონის ფოტოს სიმაღლე
          </span>
          <span className="text-xs font-bold text-blue-900 dark:text-blue-100">
            {hero.mobileH ?? 220}px
          </span>
        </div>
        <input
          type="range"
          min={80}
          max={520}
          step={4}
          value={hero.mobileH ?? 220}
          onChange={(e) => onUpdate({ mobileH: Number(e.target.value) })}
          className="w-full accent-blue-600"
          aria-label="ტელეფონის ფოტოს სიმაღლე"
        />
        <p className="mt-1 text-[10px] leading-snug text-blue-900/70 dark:text-blue-200/70">
          სლაიდერი ან ფოტოს ქვედა ლურჯი ზოლი — მხოლოდ ფოტო იცვლება, არა მთელი გვერდი.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">
            ტელეფონი — ბლოკების დაშორება
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">
            {hero.mobileStackGap ?? 4}px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={hero.mobileStackGap ?? 4}
          onChange={(e) => onUpdate({ mobileStackGap: Number(e.target.value) })}
          className="w-full accent-blue-600"
          aria-label="ტელეფონზე ბლოკების დაშორება"
        />
        <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-zinc-400">
          ყველა მობილური ბლოკის დაშორება (გარიგება, ძიება, ფილტრები, ტიპი, რუკა). Design Mode-ში
          ბლოკს ზემოთ/ქვემოთ გადაათრიე უფრო მჭიდროდ ან უფრო შორს მოსაწევად.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">
            დესკტოპის სიმაღლე
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">{hero.h}px</span>
        </div>
        <input
          type="range"
          min={80}
          max={900}
          step={4}
          value={hero.h}
          onChange={(e) => onUpdate({ h: Number(e.target.value) })}
          className="w-full accent-blue-600"
          aria-label="დესკტოპის ჰეროს სიმაღლე"
        />
        <NumField
          label="ზუსტი (1920×H)"
          value={hero.h}
          min={80}
          max={900}
          onCommit={(h) => onUpdate({ h })}
        />
      </div>
      <LayerOpacityField
        value={hero.opacity}
        onChange={(opacity) => onUpdate({ opacity })}
      />

      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        ცვლის ინტერვალი (წამი)
        <input
          type="number"
          min={2}
          max={120}
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={hero.intervalSec}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onUpdate({ intervalSec: n });
          }}
        />
      </label>

      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        გადასვლის სტილი
        <select
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={hero.transition}
          onChange={(e) => onUpdate({ transition: e.target.value as HeroTransition })}
        >
          {HERO_TRANSITIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <p className="text-[11px] leading-snug text-slate-500 dark:text-zinc-400">
          თითოეულ რეჟიმს ცალკე გალერეა აქვს. ღამის ფოტოები დღის რეჟიმში არ გამოჩნდება — და პირიქით.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.gif"
          multiple
          className="hidden"
          onChange={(e) => void onPickFiles(e.target.files)}
        />

        {modes.map((mode) => {
          const expanded = expandedModes[mode.id];
          const disableUncheck = mode.enabled && modes.filter((item) => item.enabled).length === 1;
          return (
            <div
              key={mode.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={mode.enabled}
                  disabled={disableUncheck}
                  onChange={() => onToggleModeEnabled(mode.id)}
                />
                <button
                  type="button"
                  onClick={() =>
                    setExpandedModes((prev) => ({ ...prev, [mode.id]: !prev[mode.id] }))
                  }
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                    {mode.label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {mode.imageIds.length} მედია {expanded ? '▲' : '▼'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={modes.length <= 1}
                  onClick={() => onRemoveMode(mode.id)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                >
                  წაშლა
                </button>
              </div>

              {expanded ? (
                <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setActiveModeId(mode.id)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    ამ რეჟიმის ცოცხალი გადახედვა
                  </button>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <TextField
                      label="რეჟიმის სახელი"
                      value={mode.label}
                      onCommit={(label) => onUpdateMode(mode.id, { label })}
                    />
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                      საბაზისო ტონი
                      <select
                        value={mode.baseTone}
                        onChange={(e) =>
                          onUpdateMode(mode.id, { baseTone: e.target.value as ThemeBaseTone })
                        }
                        className="mt-0.5 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        {Object.entries(THEME_BASE_TONE_LABELS).map(([tone, label]) => (
                          <option key={tone} value={tone}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={uploading || mode.imageIds.length >= MAX_HERO_IMAGES_PER_MODE}
                    onClick={() => {
                      uploadModeRef.current = mode.id;
                      fileRef.current?.click();
                    }}
                    className="w-full rounded-lg bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? 'იტვირთება…'
                      : mode.imageIds.length >= MAX_HERO_IMAGES_PER_MODE
                        ? `ლიმიტი ${MAX_HERO_IMAGES_PER_MODE} მედია`
                        : `+ ფოტო / GIF ატვირთვა (${mode.label})`}
                  </button>

                  <div className="space-y-1">
                    <div className="text-[10px] font-medium text-slate-500">
                      ან ლინკი (ფოტო / GIF / ვიდეო / YouTube)
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="url"
                        value={urlDraftByMode[mode.id] || ''}
                        onChange={(e) =>
                          setUrlDraftByMode((prev) => ({
                            ...prev,
                            [mode.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onSubmitUrl(mode.id);
                          }
                        }}
                        placeholder="https://…"
                        className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        disabled={mode.imageIds.length >= MAX_HERO_IMAGES_PER_MODE}
                      />
                      <button
                        type="button"
                        disabled={mode.imageIds.length >= MAX_HERO_IMAGES_PER_MODE}
                        onClick={() => onSubmitUrl(mode.id)}
                        className="shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-white disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
                      >
                        დამატება
                      </button>
                    </div>
                    {urlErrorByMode[mode.id] ? (
                      <p className="text-[10px] text-red-600">{urlErrorByMode[mode.id]}</p>
                    ) : null}
                  </div>

                  <p className="text-[10px] leading-snug text-slate-400">
                    მონიშნე checkbox-ით, უნდა იყოს თუ არა ეს რეჟიმი აქტიური გადასართავში და
                    სლაიდშოუში. მინიმუმ ერთი უნდა დარჩეს ჩართული.
                  </p>

                  <HeroGalleryThumbs
                    ids={mode.imageIds}
                    rotationIds={mode.rotationIds}
                    onRemove={(id) => void onRemove(mode.id, id)}
                    onMove={(id, dir) => onMove(mode.id, id, dir)}
                    onToggleRotation={(id) => onToggleRotation(mode.id, id)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAddMode}
          className="w-full rounded-lg border border-dashed border-blue-400 px-2 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300"
        >
          + რეჟიმის დამატება
        </button>
      </div>
    </div>
  );
}

function HeaderEditor({
  header,
  modes,
  selectedItemId,
  onSelectItem,
  onUpdate,
  onUpdatePalette,
  onResetPalette,
  onSetBgImage,
  onSetBgMediaUrl,
  onRemoveBgMedia,
}: {
  header: HeaderLayout;
  modes: ThemeModeDef[];
  selectedItemId: HeaderItemId | null;
  onSelectItem: (id: HeaderItemId | null) => void;
  onUpdate: (patch: Partial<HeaderLayout>) => void;
  onUpdatePalette: (modeId: string, patch: Partial<ThemePalette>) => void;
  onResetPalette: (modeId: string) => void;
  onSetBgImage: (modeId: string, file: File) => Promise<void>;
  onSetBgMediaUrl: (modeId: string, url: string) => boolean;
  onRemoveBgMedia: (modeId: string) => void;
}) {
  const { activeModeId, setActiveModeId } = useTheme();
  const activeMode = modes.find((mode) => mode.id === activeModeId) || modes[0];
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [urlDraft, setUrlDraft] = React.useState('');
  const [urlError, setUrlError] = React.useState('');
  const [thumbUrl, setThumbUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUrlDraft(activeMode?.headerBgMediaUrl || '');
    setUrlError('');
  }, [activeMode?.id, activeMode?.headerBgMediaUrl]);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    void (async () => {
      if (!activeMode?.headerBgImageId) {
        if (!cancelled) setThumbUrl(null);
        return;
      }
      loaded = await resolveHeroImageUrls([activeMode.headerBgImageId]);
      if (cancelled) {
        revokeHeroUrls(loaded);
        return;
      }
      setThumbUrl(loaded[0]?.url || null);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [activeMode?.headerBgImageId]);

  if (!activeMode) return null;
  const palette = activeMode.palette;
  const headerBg = parseColorWithOpacity(palette.headerBg, '#ffffff');
  const brandColor = header.brandColor || palette.accentColor;
  const navColor = header.navColor || palette.headerText;

  const previewUrl = activeMode.headerBgMediaUrl
    ? externalMediaDisplayUrl(
        activeMode.headerBgMediaKind || 'image',
        activeMode.headerBgMediaUrl
      ).url
    : thumbUrl;
  const hasMedia = Boolean(activeMode.headerBgImageId || activeMode.headerBgMediaUrl);
  const mediaKind =
    activeMode.headerBgMediaKind ||
    (activeMode.headerBgImageId ? 'image' : undefined);

  if (selectedItemId) {
    return (
      <HeaderItemEditor
        header={header}
        itemId={selectedItemId}
        brandFallbackColor={brandColor}
        navFallbackColor={navColor}
        onBack={() => onSelectItem(null)}
        onUpdate={onUpdate}
      />
    );
  }

  return (
    <div className="space-y-3">
      <NumField
        label="სიმაღლე (H)"
        value={header.h}
        min={44}
        max={120}
        paramKey="headerH"
        onCommit={(h) => onUpdate({ h })}
      />
      <LayerOpacityField
        value={header.opacity}
        onChange={(opacity) => onUpdate({ opacity })}
      />
      <NumField
        label="სიტყვების ზღვარი (px)"
        value={header.itemGapPx ?? HEADER_ITEM_GAP_PX_DEFAULT}
        min={0}
        max={HEADER_ITEM_GAP_PX_MAX}
        onCommit={(itemGapPx) => {
          const gap = clampHeaderItemGapPx(itemGapPx);
          const nextHeader = { ...header, itemGapPx: gap };
          const opts = headerOverlapOptsForEditor(nextHeader);
          const seeded = seedVisibleHeaderPositions(
            header.itemPositions,
            queryHeaderCanvas()
          );
          const next = spreadHeaderItemPositions(seeded, { ...opts, gapPx: gap });
          onUpdate({ itemGapPx: gap, itemPositions: next });
        }}
      />
      <p className="text-[10px] leading-snug text-slate-400">
        ჰედერის ქვედა ლურჯ ზოლზე გადაათრიე — სიმაღლე იცვლება. ლოგო/მენიუს ტექსტს ჰედერში
        გადაათრიე (Shift = მხოლოდ ჰორიზონტალურად, Alt = მხოლოდ ვერტიკალურად). სიტყვები
        ერთმანეთს არ გადაეფარებიან — ზღვარი აქ იცვლება. ცარიელ ადგილზე კლიკი = ჰედერის
        ფოლდერი; ელემენტზე კლიკი = ქვეფოლდერი.
      </p>

      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            ელემენტები
          </div>
          {header.itemPositions && Object.keys(header.itemPositions).length > 0 ? (
            <button
              type="button"
              onClick={() => onUpdate({ itemPositions: {} })}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ფლექსზე დაბრუნება
            </button>
          ) : null}
        </div>
        {HEADER_ITEM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectItem(id)}
            className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-[12px] font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
          >
            <span>{HEADER_ITEM_LABELS[id]}</span>
            <span className="text-[11px] font-medium text-slate-400">→</span>
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          ნაგულისხმევი სტილი
        </div>
        <p className="text-[10px] leading-snug text-slate-400">
          გამოიყენება ელემენტებზე, რომლებსაც ცალკე ზომა/ფერი არ აქვთ.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="ლოგოს ზომა"
            value={header.brandFontSize}
            min={12}
            max={40}
            onCommit={(brandFontSize) => onUpdate({ brandFontSize })}
          />
          <ColorField
            label="ლოგოს ფერი"
            value={brandColor}
            onChange={(next) => onUpdate({ brandColor: next })}
          />
          <NumField
            label="მენიუს ზომა"
            value={header.navFontSize}
            min={10}
            max={24}
            onCommit={(navFontSize) => onUpdate({ navFontSize })}
          />
          <ColorField
            label="მენიუს ფერი"
            value={navColor}
            onChange={(next) => onUpdate({ navColor: next })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActiveModeId(m.id)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              activeMode.id === m.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            ჰედერის ფონი ({activeMode.label})
          </div>
          <button
            type="button"
            onClick={() => onResetPalette(activeMode.id)}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ნაგულისხმევი ფერი
          </button>
        </div>
        <p className="text-[10px] leading-snug text-amber-800/90 dark:text-amber-200/90">
          ფოტო / GIF / ვიდეო ამ რეჟიმისთვის ინახება ცალკე.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="ჰედერის ფონი"
            value={headerBg.hex}
            onChange={(hex) =>
              onUpdatePalette(activeMode.id, { headerBg: hexToRgba(hex, headerBg.opacity) })
            }
          />
          <ColorField
            label="რეჟიმის ნავიგაცია"
            value={palette.headerText}
            onChange={(headerText) => onUpdatePalette(activeMode.id, { headerText })}
          />
          <ColorField
            label="რეჟიმის აქცენტი"
            value={palette.accentColor}
            onChange={(accentColor) => onUpdatePalette(activeMode.id, { accentColor })}
          />
        </div>
        <OpacityField
          label="ჰედერის გამჭვირვალობა"
          value={headerBg.opacity}
          onChange={(opacity) =>
            onUpdatePalette(activeMode.id, { headerBg: hexToRgba(headerBg.hex, opacity) })
          }
        />

        <div className="space-y-1 border-t border-slate-200 pt-2 dark:border-zinc-700">
          <div className="text-[10px] font-medium text-slate-500">
            ფონის მედია
            {mediaKind ? (
              <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                {mediaKindLabel(mediaKind)}
                {activeMode.headerBgMediaUrl ? ' · ლინკი' : ''}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-12 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-200 dark:border-zinc-600 dark:bg-zinc-800"
              style={
                previewUrl
                  ? {
                      backgroundImage: `url(${previewUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.gif,video/mp4,video/webm,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void onSetBgImage(activeMode.id, file);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {hasMedia ? 'ფაილის შეცვლა' : 'ფოტო / GIF / ვიდეო ატვირთვა'}
              </button>
              {hasMedia ? (
                <button
                  type="button"
                  onClick={() => onRemoveBgMedia(activeMode.id)}
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  მედიის წაშლა
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-medium text-slate-500">
              ან ლინკი (ფოტო / GIF / ვიდეო / YouTube)
            </div>
            <div className="flex gap-1">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const ok = onSetBgMediaUrl(activeMode.id, urlDraft);
                    if (!ok) {
                      setUrlError('ჩაწერე სწორი ლინკი');
                      return;
                    }
                    setUrlError('');
                  }
                }}
                placeholder="https://…"
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  const ok = onSetBgMediaUrl(activeMode.id, urlDraft);
                  if (!ok) {
                    setUrlError('ჩაწერე სწორი ლინკი');
                    return;
                  }
                  setUrlError('');
                }}
                className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
              >
                შენახვა
              </button>
            </div>
            {urlError ? <p className="text-[10px] text-red-600">{urlError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderItemEditor({
  header,
  itemId,
  brandFallbackColor,
  navFallbackColor,
  onBack,
  onUpdate,
}: {
  header: HeaderLayout;
  itemId: HeaderItemId;
  brandFallbackColor: string;
  navFallbackColor: string;
  onBack: () => void;
  onUpdate: (patch: Partial<HeaderLayout>) => void;
}) {
  const labelKey = headerItemLabelKey(itemId);
  const labelValue = labelKey ? header[labelKey] || '' : '';
  const pos = resolveHeaderItemPos(header.itemPositions, itemId);
  const itemStyle = header.itemStyles?.[itemId];
  const isBrand = itemId === 'brand';
  const isWidget = itemId === 'theme' || itemId === 'language';
  const fontSize =
    itemStyle?.fontSize ?? (isBrand ? header.brandFontSize : header.navFontSize);
  const color =
    itemStyle?.color ||
    (isBrand ? header.brandColor || brandFallbackColor : header.navColor || navFallbackColor);

  const patchItemStyle = (patch: {
    fontSize?: number;
    color?: string;
    opacity?: number;
    padPx?: number;
  }) => {
    const prev = header.itemStyles?.[itemId] || {};
    const nextStyle = { ...prev, ...patch };
    if (patch.padPx === 0) delete nextStyle.padPx;
    if (isBrand) {
      // Keep legacy brand fields in sync when editing logo folder
      const legacy: Partial<HeaderLayout> = {};
      if (patch.fontSize !== undefined) legacy.brandFontSize = patch.fontSize;
      if (patch.color !== undefined) legacy.brandColor = patch.color;
      onUpdate({
        ...legacy,
        itemStyles: {
          ...(header.itemStyles || {}),
          [itemId]: nextStyle,
        },
      });
      return;
    }
    onUpdate({
      itemStyles: {
        ...(header.itemStyles || {}),
        [itemId]: nextStyle,
      },
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        <span aria-hidden>←</span>
        <span>ჰედერი</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-700 dark:text-blue-300">{HEADER_ITEM_LABELS[itemId]}</span>
      </button>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {HEADER_ITEM_LABELS[itemId]}
        </div>
        {labelKey ? (
          <TextField
            label={isBrand ? 'ტექსტი (ცარიელი = Vhome)' : 'ტექსტი (ცარიელი = თარგმანი)'}
            value={labelValue}
            onCommit={(value) => onUpdate({ [labelKey]: value })}
          />
        ) : (
          <p className="text-[10px] leading-snug text-slate-400">
            ამ ელემენტს ტექსტი არ აქვს — მხოლოდ პოზიცია იცვლება.
          </p>
        )}
        {!isWidget ? (
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="ზომა"
              value={fontSize}
              min={10}
              max={48}
              onCommit={(next) => patchItemStyle({ fontSize: next })}
            />
            <ColorField
              label="ფერი"
              value={color}
              onChange={(next) => patchItemStyle({ color: next })}
            />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="X (%)"
            value={pos.x}
            min={0}
            max={100}
            decimals={1}
            paramKey="posX"
            onCommit={(x) => {
              const opts = headerOverlapOptsForEditor(header);
              const nextPos = resolveHeaderItemNoOverlap(
                itemId,
                { x, y: pos.y },
                {
                  ...(header.itemPositions || {}),
                  [itemId]: { x, y: pos.y },
                },
                opts
              );
              onUpdate({
                itemPositions: {
                  ...(header.itemPositions || {}),
                  [itemId]: nextPos,
                },
              });
            }}
          />
          <NumField
            label="Y (%)"
            value={pos.y}
            min={0}
            max={100}
            decimals={1}
            paramKey="posY"
            onCommit={(y) => {
              const opts = headerOverlapOptsForEditor(header);
              const nextPos = resolveHeaderItemNoOverlap(
                itemId,
                { x: pos.x, y },
                {
                  ...(header.itemPositions || {}),
                  [itemId]: { x: pos.x, y },
                },
                opts
              );
              onUpdate({
                itemPositions: {
                  ...(header.itemPositions || {}),
                  [itemId]: nextPos,
                },
              });
            }}
          />
        </div>
        <NumField
          label="ზღვარი გარშემო (px)"
          value={itemStyle?.padPx ?? 0}
          min={0}
          max={HEADER_ITEM_GAP_PX_MAX}
          onCommit={(padPx) => {
            const nextPad = clampHeaderItemGapPx(padPx, 0);
            const prev = header.itemStyles?.[itemId] || {};
            const nextStyle: HeaderItemStyle = { ...prev, padPx: nextPad };
            if (nextPad === 0) delete nextStyle.padPx;
            const nextStyles = {
              ...(header.itemStyles || {}),
              [itemId]: nextStyle,
            };
            const opts = headerOverlapOptsForEditor({ ...header, itemStyles: nextStyles });
            const nextPositions = header.itemPositions
              ? spreadHeaderItemPositions(header.itemPositions, opts)
              : header.itemPositions;
            onUpdate({
              itemStyles: nextStyles,
              ...(nextPositions ? { itemPositions: nextPositions } : {}),
            });
          }}
        />
        <LayerOpacityField
          value={itemStyle?.opacity}
          onChange={(opacity) => patchItemStyle({ opacity })}
        />
        <p className="text-[10px] leading-snug text-slate-400">
          ჰედერზე გადაათრიე იგივე ელემენტი — პოზიცია აქაც განახლდება. Shift = მხოლოდ
          ჰორიზონტალურად, Alt = მხოლოდ ვერტიკალურად. „ზღვარი გარშემო“ ამ სიტყვას სხვებისგან
          უფრო შორს აჩერებს.
        </p>
      </div>
    </div>
  );
}

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SiteSocialLinks;
  onChange: (patch: Partial<SiteSocialLinks>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-slate-500 dark:text-zinc-400">
        აქ ჩასვი საიტის ოფიციალური გვერდები. Messenger / Instagram / WhatsApp / Telegram იკონი
        ჩათს ხსნის; YouTube, TikTok, X და LinkedIn — პროფილს.
      </p>
      {SITE_SOCIAL_NETWORKS.map((network) => {
        const resolved = siteSocialChatUrl(network, links[network]);
        return (
          <div key={network}>
            <TextField
              label={SITE_SOCIAL_FIELD_LABELS[network]}
              value={links[network]}
              placeholder={SITE_SOCIAL_PLACEHOLDERS[network]}
              onCommit={(v) => onChange({ [network]: v })}
            />
            {resolved ? (
              <p className="mt-0.5 truncate text-[10px] text-emerald-600 dark:text-emerald-400" title={resolved}>
                ბმული: {resolved}
              </p>
            ) : links[network].trim() ? (
              <p className="mt-0.5 text-[10px] text-amber-600">ბმული ვერ ამოიცნო — შეამოწმე ფორმატი.</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ThemeEditor({
  modes,
  onAddMode,
  onRemoveMode,
  onUpdateMode,
  onUpdatePalette,
  onResetPalette,
  onToggleModeEnabled,
  onSetToggleIconImage,
  onSetToggleIconMediaUrl,
  onRemoveToggleIconMedia,
}: {
  modes: ThemeModeDef[];
  onAddMode: () => void;
  onRemoveMode: (modeId: string) => boolean;
  onUpdateMode: (
    modeId: string,
    patch: Partial<Pick<ThemeModeDef, 'label' | 'baseTone' | 'enabled' | 'toggleIconEmoji'>>
  ) => void;
  onUpdatePalette: (modeId: string, patch: Partial<ThemePalette>) => void;
  onResetPalette: (modeId: string) => void;
  onToggleModeEnabled: (modeId: string) => void;
  onSetToggleIconImage: (modeId: string, file: File) => Promise<void>;
  onSetToggleIconMediaUrl: (modeId: string, url: string) => boolean;
  onRemoveToggleIconMedia: (modeId: string) => void;
}) {
  const { activeModeId, setActiveModeId } = useTheme();
  const activeMode = modes.find((mode) => mode.id === activeModeId) || modes[0];
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [urlDraft, setUrlDraft] = React.useState('');
  const [urlError, setUrlError] = React.useState('');
  const [thumbUrl, setThumbUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUrlDraft(activeMode?.toggleIconMediaUrl || '');
    setUrlError('');
  }, [activeMode?.id, activeMode?.toggleIconMediaUrl]);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    void (async () => {
      if (!activeMode?.toggleIconImageId) {
        if (!cancelled) setThumbUrl(null);
        return;
      }
      loaded = await resolveHeroImageUrls([activeMode.toggleIconImageId]);
      if (cancelled) {
        revokeHeroUrls(loaded);
        return;
      }
      setThumbUrl(loaded[0]?.url || null);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [activeMode?.toggleIconImageId]);

  if (!activeMode) return null;

  const previewUrl = activeMode.toggleIconMediaUrl
    ? externalMediaDisplayUrl(
        activeMode.toggleIconMediaKind || 'image',
        activeMode.toggleIconMediaUrl
      ).url
    : thumbUrl;
  const hasMedia = Boolean(activeMode.toggleIconImageId || activeMode.toggleIconMediaUrl);
  const mediaKind =
    activeMode.toggleIconMediaKind ||
    (activeMode.toggleIconImageId ? 'image' : undefined);
  const emojiFallback = THEME_BASE_TONE_ICONS[activeMode.baseTone];
  const emojiDisplay = resolveToggleIconEmoji(activeMode);

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          რომელი რეჟიმები ჩანდეს გადასართავში
        </div>
        <p className="text-[10px] leading-snug text-slate-400">
          მონიშნე რეჟიმები, რომლებიც ჰედერის იკონით გადაირთვება. მინიმუმ ერთი უნდა დარჩეს ჩართული.
        </p>
        <div className="space-y-1">
          {modes.map((m) => {
            const disableUncheck = m.enabled && modes.filter((item) => item.enabled).length === 1;
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-[12px] font-semibold ${
                  m.enabled
                    ? 'border-blue-300 bg-white text-slate-800 dark:border-blue-700 dark:bg-zinc-900 dark:text-zinc-100'
                    : 'border-slate-200 bg-slate-100/80 text-slate-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={m.enabled}
                  disabled={disableUncheck}
                  onChange={() => onToggleModeEnabled(m.id)}
                />
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                <span className="text-[10px] font-medium text-slate-400">
                  {m.enabled ? 'ჩართული' : 'გამორთული'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActiveModeId(m.id)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              activeMode.id === m.id
                ? 'bg-blue-600 text-white'
                : m.enabled
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200'
                  : 'bg-slate-50 text-slate-400 line-through dark:bg-zinc-950 dark:text-zinc-600'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onAddMode}
          className="rounded-md border border-dashed border-blue-400 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300"
        >
          + რეჟიმის დამატება
        </button>
      </div>
      <TextField
        label="რეჟიმის სახელი"
        value={activeMode.label}
        onCommit={(label) => onUpdateMode(activeMode.id, { label })}
      />
      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        საბაზისო ტონი
        <select
          value={activeMode.baseTone}
          onChange={(e) =>
            onUpdateMode(activeMode.id, { baseTone: e.target.value as ThemeBaseTone })
          }
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {Object.entries(THEME_BASE_TONE_LABELS).map(([tone, label]) => (
            <option key={tone} value={tone}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          გადასართავი იკონი ({activeMode.label})
        </div>
        <p className="text-[10px] leading-snug text-slate-400">
          ნაგულისხმევი არის Unicode emoji ({emojiFallback}). შეგიძლია სხვა emoji ჩასვა, ან ფოტო /
          GIF / ვიდეო ატვირთო / ლინკი. Design Mode-ში ჰედერზე იკონზე კლიკი აქ გახსნის ამ
          პანელს. ჩვეულებრივ რეჟიმში ღილაკზე ჩანს შემდეგი რეჟიმის იკონი.
        </p>
        <TextField
          label={`Emoji (ცარიელი = ${emojiFallback})`}
          value={activeMode.toggleIconEmoji || ''}
          onCommit={(toggleIconEmoji) => onUpdateMode(activeMode.id, { toggleIconEmoji })}
        />
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-lg dark:border-zinc-600 dark:bg-zinc-900"
            style={
              previewUrl
                ? {
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            {!previewUrl ? emojiDisplay : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.gif,video/mp4,video/webm,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void onSetToggleIconImage(activeMode.id, file);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {hasMedia ? 'ფაილის შეცვლა' : 'ფოტო / GIF / ვიდეო ატვირთვა'}
            </button>
            {hasMedia ? (
              <button
                type="button"
                onClick={() => onRemoveToggleIconMedia(activeMode.id)}
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                მედიის წაშლა (emoji-ზე დაბრუნება)
              </button>
            ) : null}
          </div>
        </div>
        {mediaKind ? (
          <div className="text-[10px] text-slate-500">
            ტიპი:{' '}
            <span className="rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase dark:bg-zinc-800">
              {mediaKindLabel(mediaKind)}
              {activeMode.toggleIconMediaUrl ? ' · ლინკი' : ''}
            </span>
          </div>
        ) : null}
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-slate-500">
            ან ლინკი (ფოტო / GIF / ვიდეო / YouTube)
          </div>
          <div className="flex gap-1">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const ok = onSetToggleIconMediaUrl(activeMode.id, urlDraft);
                  if (!ok) {
                    setUrlError('ჩაწერე სწორი ლინკი');
                    return;
                  }
                  setUrlError('');
                }
              }}
              placeholder="https://…"
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                const ok = onSetToggleIconMediaUrl(activeMode.id, urlDraft);
                if (!ok) {
                  setUrlError('ჩაწერე სწორი ლინკი');
                  return;
                }
                setUrlError('');
              }}
              className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
            >
              შენახვა
            </button>
          </div>
          {urlError ? <p className="text-[10px] text-red-600">{urlError}</p> : null}
        </div>
      </div>

      <button
        type="button"
        disabled={modes.length <= 1}
        onClick={() => onRemoveMode(activeMode.id)}
        className="w-full rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
      >
        რეჟიმის წაშლა
      </button>
      <ModePaletteEditor
        palette={activeMode.palette}
        onChange={(patch) => onUpdatePalette(activeMode.id, patch)}
        onReset={() => onResetPalette(activeMode.id)}
        variant="page"
      />
    </div>
  );
}

function ModePaletteEditor({
  palette,
  onChange,
  onReset,
  variant = 'page',
}: {
  palette: ThemePalette;
  onChange: (patch: Partial<ThemePalette>) => void;
  onReset: () => void;
  variant?: 'page' | 'all';
}) {
  const header = parseColorWithOpacity(palette.headerBg, '#ffffff');

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {variant === 'page' ? 'გვერდის ფერები' : 'რეჟიმის ფერები'}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ნაგულისხმევი
        </button>
      </div>

      <div className="text-[10px] font-semibold text-slate-500">გვერდი</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="ფონი" value={palette.bodyBg} onChange={(bodyBg) => onChange({ bodyBg })} />
        <ColorField
          label="ტექსტი"
          value={palette.textColor}
          onChange={(textColor) => onChange({ textColor })}
        />
        <ColorField
          label="აქცენტი"
          value={palette.accentColor}
          onChange={(accentColor) => onChange({ accentColor })}
        />
      </div>

      {variant === 'all' ? (
        <>
          <div className="text-[10px] font-semibold text-slate-500">ჰედერი</div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="ჰედერის ტექსტი"
              value={palette.headerText}
              onChange={(headerText) => onChange({ headerText })}
            />
            <ColorField
              label="ჰედერის ფონი"
              value={header.hex}
              onChange={(hex) => onChange({ headerBg: hexToRgba(hex, header.opacity) })}
            />
          </div>
          <OpacityField
            label="ჰედერის გამჭვირვალობა"
            value={header.opacity}
            onChange={(opacity) => onChange({ headerBg: hexToRgba(header.hex, opacity) })}
          />
        </>
      ) : null}

      <div className="text-[10px] font-semibold text-slate-500">ობიექტები / ბარათები</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="ბარათის ფონი"
          value={palette.surfaceBg}
          onChange={(surfaceBg) => onChange({ surfaceBg })}
        />
        <ColorField
          label="ბარათის ჩარჩო"
          value={palette.surfaceBorder}
          onChange={(surfaceBorder) => onChange({ surfaceBorder })}
        />
        <ColorField
          label="ფასი / სათაური"
          value={palette.priceColor}
          onChange={(priceColor) => onChange({ priceColor })}
        />
        <ColorField
          label="მეორადი ტექსტი"
          value={palette.mutedText}
          onChange={(mutedText) => onChange({ mutedText })}
        />
      </div>

      <div className="text-[10px] font-semibold text-slate-500">რუკა</div>
      <label className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
        რუკის სტილი
        <select
          className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          value={palette.mapTiles}
          onChange={(e) => onChange({ mapTiles: e.target.value as MapTileStyle })}
        >
          {MAP_TILE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div className="text-[10px] font-semibold text-slate-500">ატმოსფერო</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="გრადიენტი 1"
          value={palette.gradientFrom}
          onChange={(gradientFrom) => onChange({ gradientFrom })}
        />
        <ColorField
          label="გრადიენტი 2"
          value={palette.gradientMid}
          onChange={(gradientMid) => onChange({ gradientMid })}
        />
        <ColorField
          label="გრადიენტი 3"
          value={palette.gradientTo}
          onChange={(gradientTo) => onChange({ gradientTo })}
        />
        <ColorField
          label="ბადე"
          value={palette.gridColor}
          onChange={(gridColor) => onChange({ gridColor })}
        />
      </div>

      <OpacityField
        label="ბადის სიმკვრივე"
        value={palette.gridOpacity}
        onChange={(gridOpacity) => onChange({ gridOpacity })}
      />

      <GlowField
        label="ნათება 1"
        color={palette.glow1}
        opacity={palette.glow1Opacity}
        onColor={(glow1) => onChange({ glow1 })}
        onOpacity={(glow1Opacity) => onChange({ glow1Opacity })}
      />
      <GlowField
        label="ნათება 2"
        color={palette.glow2}
        opacity={palette.glow2Opacity}
        onColor={(glow2) => onChange({ glow2 })}
        onOpacity={(glow2Opacity) => onChange({ glow2Opacity })}
      />
      <GlowField
        label="ნათება 3"
        color={palette.glow3}
        opacity={palette.glow3Opacity}
        onColor={(glow3) => onChange({ glow3 })}
        onOpacity={(glow3Opacity) => onChange({ glow3Opacity })}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  const [textDraft, setTextDraft] = React.useState(safeValue);
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) setTextDraft(safeValue);
  }, [safeValue]);

  return (
    <label className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
      {label}
      <div className="mt-0.5 flex items-center gap-1.5">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => {
            const next = e.target.value;
            setTextDraft(next);
            onChange(next);
          }}
          className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5 dark:border-zinc-600"
        />
        <input
          type="text"
          value={textDraft}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={() => {
            focusedRef.current = false;
            const next = textDraft.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(next)) {
              onChange(next);
            } else {
              setTextDraft(safeValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
    </label>
  );
}

function OpacityField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
      {label} ({Math.round(value * 100)}%)
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}

function LayerOpacityField({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (opacity: number) => void;
}) {
  return (
    <OpacityField label="გამჭვირვალობა" value={clampOpacity(value)} onChange={onChange} />
  );
}

function GlowField({
  label,
  color,
  opacity,
  onColor,
  onOpacity,
}: {
  label: string;
  color: string;
  opacity: number;
  onColor: (value: string) => void;
  onOpacity: (value: number) => void;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-950">
      <ColorField label={label} value={color} onChange={onColor} />
      <OpacityField label={`${label} სიძლიერე`} value={opacity} onChange={onOpacity} />
    </div>
  );
}

function HeroGalleryThumbs({
  ids,
  rotationIds,
  onRemove,
  onMove,
  onToggleRotation,
}: {
  ids: string[];
  rotationIds: string[];
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onToggleRotation: (id: string) => void;
}) {
  const [thumbs, setThumbs] = React.useState<
    { id: string; url: string; kind: DesignMediaKind }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string; kind: DesignMediaKind }[] = [];
    (async () => {
      loaded = await resolveHeroImageUrls(ids);
      if (!cancelled) setThumbs(loaded);
      else revokeHeroUrls(loaded);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ids.length === 0) {
    return <p className="text-[11px] text-slate-400">მედია ჯერ არ არის დამატებული.</p>;
  }

  return (
    <div className="space-y-2">
      {ids.map((id, index) => {
        const thumb = thumbs.find((t) => t.id === id);
        const external = parseExternalMediaId(id);
        const kind = thumb?.kind || external?.kind || 'image';
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-200 dark:bg-zinc-800">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[9px] text-slate-400">…</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                <span>#{index + 1}</span>
                <span className="rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {mediaKindLabel(kind)}
                  {external ? ' · ლინკი' : ''}
                </span>
              </div>
              <label className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={rotationIds.includes(id)}
                  onChange={() => onToggleRotation(id)}
                />
                სლაიდშოუში ჩართვა
              </label>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(id, -1)}
                className="rounded px-1 text-[10px] font-bold text-slate-600 disabled:opacity-30 dark:text-zinc-300"
                title="ზემოთ"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === ids.length - 1}
                onClick={() => onMove(id, 1)}
                className="rounded px-1 text-[10px] font-bold text-slate-600 disabled:opacity-30 dark:text-zinc-300"
                title="ქვემოთ"
              >
                ↓
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400"
            >
              წაშლა
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TypePanelItemsEditor({
  items,
  focusItemId,
  onFocusItem,
  onUpdate,
  onSetImage,
  onSetMediaUrl,
  onRemoveImage,
}: {
  items: TypePanelItem[];
  focusItemId?: string | null;
  onFocusItem?: (id: string) => void;
  onUpdate: (id: string, patch: Partial<TypePanelItem>) => void;
  onSetImage: (id: string, file: File) => Promise<void>;
  onSetMediaUrl: (id: string, url: string) => boolean;
  onRemoveImage: (id: string) => void;
}) {
  const imageIds = items.map((it) => it.imageId).filter(Boolean) as string[];
  const [thumbs, setThumbs] = React.useState<{ id: string; url: string }[]>([]);
  const [urlDraftByItem, setUrlDraftByItem] = React.useState<Record<string, string>>({});
  const [urlErrorByItem, setUrlErrorByItem] = React.useState<Record<string, string>>({});
  const fileRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    void (async () => {
      loaded = await resolveHeroImageUrls(imageIds);
      if (!cancelled) setThumbs(loaded);
      else revokeHeroUrls(loaded);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!focusItemId) return;
    const el = itemRefs.current[focusItemId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusItemId]);

  const thumbById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of thumbs) map.set(t.id, t.url);
    return map;
  }, [thumbs]);

  const previewForItem = (item: TypePanelItem): { url?: string; kind?: DesignMediaKind } => {
    if (item.mediaUrl) {
      const kind = item.mediaKind || 'image';
      const display = externalMediaDisplayUrl(kind, item.mediaUrl);
      return { url: display.url, kind };
    }
    if (item.imageId) {
      return { url: thumbById.get(item.imageId), kind: 'image' };
    }
    return {};
  };

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-zinc-700">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        კატეგორიები ({items.length})
      </div>
      <p className="text-[10px] leading-snug text-slate-400">
        დააკლიკე სტრიქონს ან ბარათს ეკრანზე. ფოტო გადაათრიე ნებისმიერ მხარეს, ბორბალი ან
        ლურჯი კუთხე — გადიდება/დაპატარავება. სახელი, რაოდენობა და იკონი ცალ-ცალკე
        გადაადგილდება.
      </p>
      {items.map((item, index) => {
        const preview = previewForItem(item);
        const previewUrl = preview.url;
        const hasMedia = Boolean(item.imageId || item.mediaUrl);
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
        const labelX = clampRailPercent(item.labelX, TYPE_PANEL_LABEL_POS_DEFAULT.x);
        const labelY = clampRailPercent(item.labelY, TYPE_PANEL_LABEL_POS_DEFAULT.y);
        const countX = clampRailPercent(item.countX, TYPE_PANEL_COUNT_POS_DEFAULT.x);
        const countY = clampRailPercent(item.countY, TYPE_PANEL_COUNT_POS_DEFAULT.y);
        const iconX = clampRailPercent(item.iconX, TYPE_PANEL_ICON_POS_DEFAULT.x);
        const iconY = clampRailPercent(item.iconY, TYPE_PANEL_ICON_POS_DEFAULT.y);
        const mediaScale = clampMediaScale(item.mediaScale);
        const mediaX = clampRailPercent(item.mediaX, TYPE_PANEL_MEDIA_POS_DEFAULT.x);
        const mediaY = clampRailPercent(item.mediaY, TYPE_PANEL_MEDIA_POS_DEFAULT.y);
        const labelColor = item.labelColor || '#1d4ed8';
        const countColor = item.countColor || '#64748b';
        const focused = focusItemId === item.id;
        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el;
            }}
            className={`rounded-lg border p-2 ${
              focused
                ? 'space-y-1.5 border-blue-500 bg-blue-50 ring-2 ring-blue-400/40 dark:border-blue-400 dark:bg-blue-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950'
            }`}
            data-inspector-focused={focused ? 'true' : undefined}
          >
            <button
              type="button"
              onClick={() => onFocusItem?.(item.id)}
              className="flex w-full items-center gap-2 text-left"
            >
              <span
                className="h-8 w-8 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-200 dark:border-zinc-600 dark:bg-zinc-800"
                style={
                  previewUrl
                    ? {
                        backgroundImage: `url(${previewUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                {!previewUrl ? (
                  <span className="flex h-full items-center justify-center text-sm">{item.icon || '·'}</span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[12px] font-semibold ${
                    focused ? 'text-blue-800 dark:text-blue-200' : 'text-slate-800 dark:text-zinc-100'
                  }`}
                >
                  #{index + 1} · {item.label}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {focused ? 'გახსნილია · დააკლიკე სხვას ჩასაკეცად' : 'დააკლიკე გასახსნელად'}
                </span>
              </span>
              <span className="text-[10px] text-slate-400">{focused ? '▾' : '▸'}</span>
            </button>
            {focused ? (
              <div className="space-y-1.5 border-t border-blue-200/60 pt-2 dark:border-blue-800/40">
            <TextField
              label="სახელი"
              value={item.label}
              onCommit={(label) => onUpdate(item.id, { label })}
            />
            <LayerOpacityField
              value={item.opacity}
              onChange={(opacity) => onUpdate(item.id, { opacity })}
            />
            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">სახელის ხაზები</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { labelWrap: false })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    item.labelWrap !== true
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  ერთი ხაზი
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { labelWrap: true })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    item.labelWrap === true
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  გადატანა
                </button>
              </div>
              {item.labelWrap === true ? (
                <NumField
                  label="გადატანის სიგანე (%)"
                  value={clampTypeLabelMaxW(item.labelMaxW)}
                  min={40}
                  max={220}
                  onCommit={(n) =>
                    onUpdate(item.id, { labelMaxW: clampTypeLabelMaxW(n) })
                  }
                />
              ) : null}
              <p className="text-[10px] leading-snug text-slate-400">
                ნაგულისხმევად „კერძო სახლი“ ერთ ხაზზეა. გადატანა — სიტყვა იხლიჩება მხოლოდ
                თუ შენ ჩართავ.
              </p>
            </div>
            <TextField
              label="იკონი (emoji)"
              value={item.icon}
              onCommit={(icon) => onUpdate(item.id, { icon })}
            />

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">ტექსტის ზომა / ფერი</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="სახელის ზომა"
                  value={labelFontSize}
                  min={8}
                  max={48}
                  onCommit={(n) =>
                    onUpdate(item.id, {
                      labelFontSize: clampFontSize(n, TYPE_PANEL_LABEL_FONT_DEFAULT, 8, 48),
                    })
                  }
                />
                <ColorField
                  label="სახელის ფერი"
                  value={labelColor}
                  onChange={(c) => onUpdate(item.id, { labelColor: c })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="რაოდენობის ზომა"
                  value={countFontSize}
                  min={8}
                  max={32}
                  onCommit={(n) =>
                    onUpdate(item.id, {
                      countFontSize: clampFontSize(n, TYPE_PANEL_COUNT_FONT_DEFAULT, 8, 32),
                    })
                  }
                />
                <ColorField
                  label="რაოდენობის ფერი"
                  value={countColor}
                  onChange={(c) => onUpdate(item.id, { countColor: c })}
                />
              </div>
              <NumField
                label="იკონის ზომა"
                value={iconFontSize}
                min={12}
                max={64}
                onCommit={(n) =>
                  onUpdate(item.id, {
                    iconFontSize: clampFontSize(n, TYPE_PANEL_ICON_FONT_DEFAULT, 12, 64),
                  })
                }
              />
              {(item.labelColor || item.countColor) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(item.id, {
                      labelColor: undefined,
                      countColor: undefined,
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
                >
                  ფერის ნაგულისხმევზე
                </button>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">ფორმა / მომრგვალება</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_SQUARE })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius === RAIL_RADIUS_SQUARE
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  კვადრატი
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_ROUNDED })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius === RAIL_RADIUS_ROUNDED
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  მომრგვალებული
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_CIRCLE })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius >= RAIL_RADIUS_CIRCLE
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  წრე / პილი
                </button>
              </div>
              <NumField
                label="Radius (px)"
                value={radius}
                min={0}
                onCommit={(borderRadius) => onUpdate(item.id, { borderRadius })}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">წარწერების პოზიცია (%)</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="სახელი X"
                  value={labelX}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="labelX"
                  onCommit={(x) => onUpdate(item.id, { labelX: clampRailPercent(x, 50) })}
                />
                <NumField
                  label="სახელი Y"
                  value={labelY}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="labelY"
                  onCommit={(y) => onUpdate(item.id, { labelY: clampRailPercent(y, 50) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="რაოდენობა X"
                  value={countX}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="countX"
                  onCommit={(x) => onUpdate(item.id, { countX: clampRailPercent(x, 50) })}
                />
                <NumField
                  label="რაოდენობა Y"
                  value={countY}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="countY"
                  onCommit={(y) => onUpdate(item.id, { countY: clampRailPercent(y, 50) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="იკონი X"
                  value={iconX}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="iconX"
                  onCommit={(x) => onUpdate(item.id, { iconX: clampRailPercent(x, 50) })}
                />
                <NumField
                  label="იკონი Y"
                  value={iconY}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="iconY"
                  onCommit={(y) => onUpdate(item.id, { iconY: clampRailPercent(y, 50) })}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdate(item.id, {
                    labelX: TYPE_PANEL_LABEL_POS_DEFAULT.x,
                    labelY: TYPE_PANEL_LABEL_POS_DEFAULT.y,
                    countX: TYPE_PANEL_COUNT_POS_DEFAULT.x,
                    countY: TYPE_PANEL_COUNT_POS_DEFAULT.y,
                    iconX: TYPE_PANEL_ICON_POS_DEFAULT.x,
                    iconY: TYPE_PANEL_ICON_POS_DEFAULT.y,
                  })
                }
                className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                წარწერები ნაგულისხმევზე
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">
                სურათი / GIF / ვიდეო
                {preview.kind ? (
                  <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {mediaKindLabel(preview.kind)}
                    {item.mediaUrl ? ' · ლინკი' : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-xl dark:border-zinc-600 dark:bg-zinc-800"
                  style={
                    previewUrl
                      ? {
                          backgroundImage: `url(${previewUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  {!previewUrl ? item.icon : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input
                    ref={(el) => {
                      fileRefs.current[item.id] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void onSetImage(item.id, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefs.current[item.id]?.click()}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {hasMedia ? 'ფაილის შეცვლა' : 'ფოტო / GIF ატვირთვა'}
                  </button>
                  {hasMedia ? (
                    <button
                      type="button"
                      onClick={() => onRemoveImage(item.id)}
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      მედიის წაშლა
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-slate-500">
                  ან ლინკი (ფოტო / GIF / ვიდეო / YouTube)
                </div>
                <div className="flex gap-1">
                  <input
                    type="url"
                    value={urlDraftByItem[item.id] ?? item.mediaUrl ?? ''}
                    onChange={(e) =>
                      setUrlDraftByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const raw = urlDraftByItem[item.id] ?? item.mediaUrl ?? '';
                        const ok = onSetMediaUrl(item.id, raw);
                        if (!ok) {
                          setUrlErrorByItem((prev) => ({
                            ...prev,
                            [item.id]: 'ჩაწერე სწორი ლინკი',
                          }));
                          return;
                        }
                        setUrlErrorByItem((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }
                    }}
                    placeholder="https://…"
                    className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const raw = urlDraftByItem[item.id] ?? item.mediaUrl ?? '';
                      const ok = onSetMediaUrl(item.id, raw);
                      if (!ok) {
                        setUrlErrorByItem((prev) => ({
                          ...prev,
                          [item.id]: 'ჩაწერე სწორი ლინკი',
                        }));
                        return;
                      }
                      setUrlErrorByItem((prev) => {
                        const next = { ...prev };
                        delete next[item.id];
                        return next;
                      });
                    }}
                    className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
                  >
                    შენახვა
                  </button>
                </div>
                {urlErrorByItem[item.id] ? (
                  <p className="text-[10px] text-red-600">{urlErrorByItem[item.id]}</p>
                ) : null}
              </div>
              {hasMedia ? (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-medium text-slate-500">ფოტოს ზომა / პოზიცია</div>
                  <NumField
                    label="მასშტაბი (%)"
                    value={mediaScale}
                    min={50}
                    max={400}
                    paramKey="mediaScale"
                    onCommit={(n) => onUpdate(item.id, { mediaScale: clampMediaScale(n) })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <NumField
                      label="ფოტო X"
                      value={mediaX}
                      min={0}
                      max={100}
                      decimals={1}
                      paramKey="mediaX"
                      onCommit={(x) => onUpdate(item.id, { mediaX: clampRailPercent(x, 50) })}
                    />
                    <NumField
                      label="ფოტო Y"
                      value={mediaY}
                      min={0}
                      max={100}
                      decimals={1}
                      paramKey="mediaY"
                      onCommit={(y) => onUpdate(item.id, { mediaY: clampRailPercent(y, 50) })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate(item.id, {
                        mediaScale: TYPE_PANEL_MEDIA_SCALE_DEFAULT,
                        mediaX: TYPE_PANEL_MEDIA_POS_DEFAULT.x,
                        mediaY: TYPE_PANEL_MEDIA_POS_DEFAULT.y,
                      })
                    }
                    className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    ფოტო ცენტრში · 100%
                  </button>
                </div>
              ) : null}
            </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RailItemsEditor({
  items,
  focusItemId,
  onFocusItem,
  modeLabel,
  onAdd,
  onRemove,
  onUpdate,
  onSetImage,
  onSetMediaUrl,
  onRemoveImage,
  showHint,
  defaultRadius,
  circleRadiusHint,
}: {
  items: RailItem[];
  focusItemId?: string | null;
  onFocusItem?: (id: string) => void;
  modeLabel: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RailItem>) => void;
  onSetImage: (id: string, file: File) => Promise<void>;
  onSetMediaUrl: (id: string, url: string) => boolean;
  onRemoveImage: (id: string) => void;
  showHint: boolean;
  defaultRadius: number;
  circleRadiusHint: number;
}) {
  const imageIds = items.map((it) => it.imageId).filter(Boolean) as string[];
  const [thumbs, setThumbs] = React.useState<{ id: string; url: string }[]>([]);
  const [urlDraftByItem, setUrlDraftByItem] = React.useState<Record<string, string>>({});
  const [urlErrorByItem, setUrlErrorByItem] = React.useState<Record<string, string>>({});
  const fileRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];
    void (async () => {
      loaded = await resolveHeroImageUrls(imageIds);
      if (!cancelled) setThumbs(loaded);
      else revokeHeroUrls(loaded);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!focusItemId) return;
    const el = itemRefs.current[focusItemId];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusItemId]);

  const thumbById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of thumbs) map.set(t.id, t.url);
    return map;
  }, [thumbs]);

  const previewForItem = (item: RailItem): { url?: string; kind?: DesignMediaKind } => {
    if (item.mediaUrl) {
      const kind = item.mediaKind || 'image';
      const display = externalMediaDisplayUrl(kind, item.mediaUrl);
      return { url: display.url, kind };
    }
    if (item.imageId) {
      return { url: thumbById.get(item.imageId), kind: 'image' };
    }
    return {};
  };

  return (
    <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          ელემენტები ({items.length})
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
        >
          + ამ რეჟიმში
        </button>
      </div>
      <p className="text-[10px] leading-snug text-slate-400">
        ახალი ჩანს მხოლოდ <strong>{modeLabel}</strong>-ში. დააკლიკე სტრიქონს — გაიხსნება დეტალები.
      </p>
      {items.map((item, index) => {
        const preview = previewForItem(item);
        const previewUrl = preview.url;
        const hasMedia = Boolean(item.imageId || item.mediaUrl);
        const radius = clampRailRadius(item.borderRadius, defaultRadius);
        const labelX = clampRailPercent(item.labelX, RAIL_LABEL_DEFAULT.x);
        const labelY = clampRailPercent(item.labelY, RAIL_LABEL_DEFAULT.y);
        const labelFontSize = clampFontSize(
          item.labelFontSize,
          RAIL_LABEL_FONT_DEFAULT,
          10,
          48
        );
        const hintFontSize = clampFontSize(
          item.hintFontSize,
          RAIL_HINT_FONT_DEFAULT,
          9,
          32
        );
        const labelColor = item.labelColor || '#1d4ed8';
        const focused = focusItemId === item.id;
        const hintColor = item.hintColor || '#64748b';
        const itemHidden = item.hidden === true;
        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el;
            }}
            className={`rounded-lg border p-2 ${
              focused
                ? 'space-y-1.5 border-blue-500 bg-blue-50 ring-2 ring-blue-400/40 dark:border-blue-400 dark:bg-blue-950/40'
                : itemHidden
                  ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/30'
                  : 'border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950'
            }`}
            data-inspector-focused={focused ? 'true' : undefined}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onFocusItem?.(item.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className="h-8 w-8 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-200 dark:border-zinc-600 dark:bg-zinc-800"
                  style={
                    previewUrl
                      ? {
                          backgroundImage: `url(${previewUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: Math.min(radius, 12),
                        }
                      : { borderRadius: Math.min(radius, 12) }
                  }
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[12px] font-semibold ${
                      focused
                        ? 'text-blue-800 dark:text-blue-200'
                        : itemHidden
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-slate-800 dark:text-zinc-100'
                    }`}
                  >
                    #{index + 1} · {item.label}
                    {itemHidden ? ' · დამალული' : ''}
                  </span>
                  <span className="block truncate text-[10px] text-slate-400">
                    {focused ? 'გახსნილია' : item.href || 'დააკლიკე გასახსნელად'}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">{focused ? '▾' : '▸'}</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdate(item.id, { hidden: !itemHidden })}
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/50"
              >
                {itemHidden ? 'ჩვენება' : 'დამალვა'}
              </button>
            </div>
            {focused ? (
              <div className="space-y-1.5 border-t border-blue-200/60 pt-2 dark:border-blue-800/40">
            <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const ok =
                      typeof window === 'undefined'
                        ? true
                        : window.confirm(
                            'ელემენტი წაიშლება ყველა რეჟიმიდან. მხოლოდ ამ რეჟიმისთვის საკმარისია „დამალვა“.'
                          );
                    if (ok) onRemove(item.id);
                  }}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  ყველაგან წაშლა
                </button>
            </div>
            <TextField
              label="სახელი"
              value={item.label}
              onCommit={(label) => onUpdate(item.id, { label })}
            />
            <LayerOpacityField
              value={item.opacity}
              onChange={(opacity) => onUpdate(item.id, { opacity })}
            />
            {showHint ? (
              <TextField
                label="ქვესათაური"
                value={item.hint || ''}
                onCommit={(hint) => onUpdate(item.id, { hint })}
              />
            ) : null}
            <TextField
              label="ბმული (href)"
              value={item.href}
              onCommit={(href) => onUpdate(item.id, { href })}
            />

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">ტექსტის ზომა / ფერი</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="სახელის ზომა"
                  value={labelFontSize}
                  min={10}
                  max={48}
                  onCommit={(n) =>
                    onUpdate(item.id, { labelFontSize: clampFontSize(n, RAIL_LABEL_FONT_DEFAULT, 10, 48) })
                  }
                />
                <ColorField
                  label="სახელის ფერი"
                  value={labelColor}
                  onChange={(c) => onUpdate(item.id, { labelColor: c })}
                />
              </div>
              {showHint ? (
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="ქვესათაურის ზომა"
                    value={hintFontSize}
                    min={9}
                    max={32}
                    onCommit={(n) =>
                      onUpdate(item.id, {
                        hintFontSize: clampFontSize(n, RAIL_HINT_FONT_DEFAULT, 9, 32),
                      })
                    }
                  />
                  <ColorField
                    label="ქვესათაურის ფერი"
                    value={hintColor}
                    onChange={(c) => onUpdate(item.id, { hintColor: c })}
                  />
                </div>
              ) : null}
              {(item.labelColor || item.hintColor) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(item.id, {
                      labelColor: undefined,
                      hintColor: undefined,
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
                >
                  ფერის ნაგულისხმევზე
                </button>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">ფორმა / მომრგვალება</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_SQUARE })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius === RAIL_RADIUS_SQUARE
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  კვადრატი
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { borderRadius: RAIL_RADIUS_ROUNDED })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius === RAIL_RADIUS_ROUNDED
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  მომრგვალებული
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(item.id, {
                      borderRadius: Math.max(circleRadiusHint, RAIL_RADIUS_CIRCLE),
                    })
                  }
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    radius >= circleRadiusHint
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-700 dark:border-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  წრე / პილი
                </button>
              </div>
              <NumField
                label="Radius (px)"
                value={radius}
                min={0}
                onCommit={(borderRadius) => onUpdate(item.id, { borderRadius })}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">წარწერის პოზიცია (%)</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="Label X"
                  value={labelX}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="labelX"
                  onCommit={(x) => onUpdate(item.id, { labelX: clampRailPercent(x, 50) })}
                />
                <NumField
                  label="Label Y"
                  value={labelY}
                  min={0}
                  max={100}
                  decimals={1}
                  paramKey="labelY"
                  onCommit={(y) => onUpdate(item.id, { labelY: clampRailPercent(y, 50) })}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdate(item.id, {
                    labelX: RAIL_LABEL_DEFAULT.x,
                    labelY: RAIL_LABEL_DEFAULT.y,
                  })
                }
                className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                ცენტრში
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-medium text-slate-500">
                სურათი / GIF / ვიდეო
                {preview.kind ? (
                  <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {mediaKindLabel(preview.kind)}
                    {item.mediaUrl ? ' · ლინკი' : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-200 dark:border-zinc-600 dark:bg-zinc-800"
                  style={
                    previewUrl
                      ? {
                          backgroundImage: `url(${previewUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input
                    ref={(el) => {
                      fileRefs.current[item.id] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void onSetImage(item.id, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefs.current[item.id]?.click()}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {hasMedia ? 'ფაილის შეცვლა' : 'ფოტო / GIF ატვირთვა'}
                  </button>
                  {hasMedia ? (
                    <button
                      type="button"
                      onClick={() => onRemoveImage(item.id)}
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      მედიის წაშლა
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-slate-500">
                  ან ლინკი (ფოტო / GIF / ვიდეო / YouTube)
                </div>
                <div className="flex gap-1">
                  <input
                    type="url"
                    value={urlDraftByItem[item.id] ?? item.mediaUrl ?? ''}
                    onChange={(e) =>
                      setUrlDraftByItem((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const raw = urlDraftByItem[item.id] ?? item.mediaUrl ?? '';
                        const ok = onSetMediaUrl(item.id, raw);
                        if (!ok) {
                          setUrlErrorByItem((prev) => ({
                            ...prev,
                            [item.id]: 'ჩაწერე სწორი ლინკი',
                          }));
                          return;
                        }
                        setUrlErrorByItem((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }
                    }}
                    placeholder="https://…"
                    className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const raw = urlDraftByItem[item.id] ?? item.mediaUrl ?? '';
                      const ok = onSetMediaUrl(item.id, raw);
                      if (!ok) {
                        setUrlErrorByItem((prev) => ({
                          ...prev,
                          [item.id]: 'ჩაწერე სწორი ლინკი',
                        }));
                        return;
                      }
                      setUrlErrorByItem((prev) => {
                        const next = { ...prev };
                        delete next[item.id];
                        return next;
                      });
                    }}
                    className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200"
                  >
                    შენახვა
                  </button>
                </div>
                {urlErrorByItem[item.id] ? (
                  <p className="text-[10px] text-red-600">{urlErrorByItem[item.id]}</p>
                ) : null}
              </div>
            </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">ცარიელია — დააჭირე „+ ამ რეჟიმში“.</p>
      ) : null}
    </div>
  );
}

function InspectorFold({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span className="text-[10px] text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div className="space-y-2 border-t border-slate-200 px-2 pb-2 pt-2 dark:border-zinc-700">{children}</div> : null}
    </div>
  );
}

function DealBarChipsEditor() {
  const design = useHomeDesignOptional();
  if (!design) return null;
  const deal = normalizeDealBar(design.layout.dealBar);
  const selected = design.selectedDealChipId;

  return (
    <InspectorFold title="ჩიპები ცალ-ცალკე (W × H)" defaultOpen>
      <NumField
        label="ჩიპების gap"
        value={deal.gap}
        min={0}
        max={32}
        onCommit={(gap) =>
          design.updateBox('dealBar', { gap } as Parameters<typeof design.updateBox>[1])
        }
      />
      <p className="mb-2 text-[10px] leading-snug text-slate-500 dark:text-zinc-400">
        დააკლიკე იყიდება/ქირავდება/გირავნობას ჰეროზე, ან აქ შეცვალე ზომები.
      </p>
      <div className="space-y-2">
        {DEAL_CHIP_IDS.map((id) => {
          const box = deal.chips[id];
          const active = selected === id;
          return (
            <div
              key={id}
              className={`rounded-lg border p-2 ${
                active
                  ? 'border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-zinc-700'
              }`}
            >
              <button
                type="button"
                className="mb-1.5 text-left text-[11px] font-bold text-slate-700 dark:text-zinc-200"
                onClick={() => {
                  design.setSelectedId('dealBar');
                  design.setSelectedDealChipId(id);
                }}
              >
                {DEAL_CHIP_LABELS[id]}
                {active ? ' ← მონიშნული' : ''}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <NumField
                  label="სიგანე (W)"
                  value={box.w}
                  min={72}
                  max={320}
                  paramKey={active ? 'w' : undefined}
                  onCommit={(w) => design.updateDealChip(id, { w })}
                />
                <NumField
                  label="სიმაღლე (H)"
                  value={box.h}
                  min={28}
                  max={72}
                  paramKey={active ? 'h' : undefined}
                  onCommit={(h) => design.updateDealChip(id, { h })}
                />
              </div>
              <LayerOpacityField
                value={box.opacity}
                onChange={(opacity) => design.updateDealChip(id, { opacity })}
              />
            </div>
          );
        })}
      </div>
    </InspectorFold>
  );
}

function SearchEditor({
  search,
  onUpdate,
}: {
  search: SearchLayout;
  onUpdate: (patch: Partial<SearchLayout>) => void;
}) {
  const design = useHomeDesignOptional();
  const s = { ...DEFAULT_SEARCH, ...search, controls: search.controls || DEFAULT_SEARCH.controls };
  const selectedControl = design?.selectedSearchControlId ?? null;

  const clearColor = (key: keyof SearchLayout) => {
    onUpdate({ [key]: undefined } as Partial<SearchLayout>);
  };

  return (
    <div className="space-y-3">
      <NumGrid
        values={{ x: s.x, y: s.y, w: s.w, h: s.h }}
        onChange={(patch) => onUpdate(patch)}
      />
      <LayerOpacityField value={s.opacity} onChange={(opacity) => onUpdate({ opacity })} />
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="ტელეფონი X"
          value={s.mobileX ?? 0}
          min={-120}
          max={360}
          paramKey="mobileX"
          onCommit={(mobileX) => onUpdate({ mobileX })}
        />
        <NumField
          label="ტელეფონი Y"
          value={s.mobileY ?? 0}
          min={-80}
          max={400}
          paramKey="mobileY"
          onCommit={(mobileY) => onUpdate({ mobileY })}
        />
      </div>
      <p className="text-[10px] leading-snug text-slate-500 dark:text-zinc-400">
        ტელეფონზე გადაათრიე ძიების ბლოკი. უარყოფითი Y ამცირებს დაშორებას ზემოთა ბლოკთან.
      </p>

      <InspectorFold title="ელემენტები ცალ-ცალკე (W × H)" defaultOpen>
        <p className="mb-2 text-[10px] leading-snug text-slate-500 dark:text-zinc-400">
          დააკლიკე ჰეროზე ფასი/ფართობი/ქალაქი/ოთახები/ძიება/გაფართოებულს/ძიების ღილაკს, ან აქ შეცვალე
          სიგანე და სიმაღლე. დაშორება — ქვემოთ „ელემენტების gap“.
        </p>
        <div className="space-y-2">
          {SEARCH_CONTROL_IDS.map((id) => {
            const box = resolveSearchControl(s, id);
            const active = selectedControl === id;
            return (
              <div
                key={id}
                className={`rounded-lg border p-2 ${
                  active
                    ? 'border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  className="mb-1.5 text-left text-[11px] font-bold text-slate-700 dark:text-zinc-200"
                  onClick={() => {
                    design?.setSelectedId('search');
                    design?.setSelectedSearchControlId(id);
                  }}
                >
                  {SEARCH_CONTROL_LABELS[id]}
                  {active ? ' ← მონიშნული' : ''}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="სიგანე (W)"
                    value={box.w}
                    min={56}
                    max={560}
                    paramKey={active ? 'w' : undefined}
                    onCommit={(w) => design?.updateSearchControl(id, { w })}
                  />
                  <NumField
                    label="სიმაღლე (H)"
                    value={box.h}
                    min={28}
                    max={120}
                    paramKey={active ? 'h' : undefined}
                    onCommit={(h) => design?.updateSearchControl(id, { h })}
                  />
                </div>
                <LayerOpacityField
                  value={box.opacity}
                  onChange={(opacity) => design?.updateSearchControl(id, { opacity })}
                />
              </div>
            );
          })}
        </div>
      </InspectorFold>

      <InspectorFold title="ჩარჩო (shell)" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="შიდა pad X"
            value={s.padX}
            min={0}
            max={48}
            onCommit={(padX) => onUpdate({ padX: clampPx(padX, DEFAULT_SEARCH.padX, 0, 48) })}
          />
          <NumField
            label="შიდა pad Y"
            value={s.padY}
            min={0}
            max={48}
            onCommit={(padY) => onUpdate({ padY: clampPx(padY, DEFAULT_SEARCH.padY, 0, 48) })}
          />
          <NumField
            label="ელემენტების gap"
            value={s.gap}
            min={0}
            max={40}
            onCommit={(gap) => onUpdate({ gap: clampPx(gap, DEFAULT_SEARCH.gap, 0, 40) })}
          />
          <NumField
            label="რადიუსი"
            value={s.borderRadius}
            min={0}
            max={48}
            onCommit={(borderRadius) =>
              onUpdate({ borderRadius: clampRailRadius(borderRadius, DEFAULT_SEARCH.borderRadius) })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <OptionalColorField
            label="საზღვრის ფერი"
            value={s.borderColor}
            onChange={(borderColor) => onUpdate({ borderColor })}
            onClear={() => clearColor('borderColor')}
          />
          <OptionalColorField
            label="ფონის ფერი"
            value={s.background}
            onChange={(background) => onUpdate({ background })}
            onClear={() => clearColor('background')}
          />
        </div>
      </InspectorFold>

      <InspectorFold title="ფილტრის ღილაკები">
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="ლეიბლის ზომა"
            value={s.labelFontSize}
            min={10}
            max={28}
            onCommit={(labelFontSize) =>
              onUpdate({
                labelFontSize: clampFontSize(labelFontSize, DEFAULT_SEARCH.labelFontSize, 10, 28),
              })
            }
          />
          <NumField
            label="ლეიბლის სიმუქე"
            value={s.labelFontWeight}
            min={400}
            max={800}
            onCommit={(labelFontWeight) =>
              onUpdate({
                labelFontWeight: clampFontWeight(labelFontWeight, DEFAULT_SEARCH.labelFontWeight),
              })
            }
          />
          <NumField
            label="მნიშვნელობის ზომა"
            value={s.summaryFontSize}
            min={9}
            max={20}
            onCommit={(summaryFontSize) =>
              onUpdate({
                summaryFontSize: clampFontSize(
                  summaryFontSize,
                  DEFAULT_SEARCH.summaryFontSize,
                  9,
                  20
                ),
              })
            }
          />
          <NumField
            label="მინ. სიმაღლე"
            value={s.triggerMinHeight}
            min={32}
            max={96}
            onCommit={(triggerMinHeight) =>
              onUpdate({
                triggerMinHeight: clampPx(
                  triggerMinHeight,
                  DEFAULT_SEARCH.triggerMinHeight,
                  32,
                  96
                ),
              })
            }
          />
          <NumField
            label="სიგანე (ყველა ღილაკი)"
            value={s.triggerWidth}
            min={72}
            max={280}
            onCommit={(triggerWidth) =>
              onUpdate({
                triggerWidth: clampPx(triggerWidth, DEFAULT_SEARCH.triggerWidth, 72, 280),
              })
            }
          />
          <NumField
            label="შიდა pad X"
            value={s.triggerPadX}
            min={4}
            max={32}
            onCommit={(triggerPadX) =>
              onUpdate({ triggerPadX: clampPx(triggerPadX, DEFAULT_SEARCH.triggerPadX, 4, 32) })
            }
          />
          <NumField
            label="შიდა pad Y"
            value={s.triggerPadY}
            min={4}
            max={32}
            onCommit={(triggerPadY) =>
              onUpdate({ triggerPadY: clampPx(triggerPadY, DEFAULT_SEARCH.triggerPadY, 4, 32) })
            }
          />
          <NumField
            label="რადიუსი"
            value={s.triggerBorderRadius}
            min={0}
            max={48}
            onCommit={(triggerBorderRadius) =>
              onUpdate({
                triggerBorderRadius: clampRailRadius(
                  triggerBorderRadius,
                  DEFAULT_SEARCH.triggerBorderRadius
                ),
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <OptionalColorField
            label="ტექსტის ფერი"
            value={s.labelColor}
            onChange={(labelColor) => onUpdate({ labelColor })}
            onClear={() => clearColor('labelColor')}
          />
          <OptionalColorField
            label="მნიშვნელობის ფერი"
            value={s.summaryColor}
            onChange={(summaryColor) => onUpdate({ summaryColor })}
            onClear={() => clearColor('summaryColor')}
          />
          <OptionalColorField
            label="საზღვარი"
            value={s.triggerBorderColor}
            onChange={(triggerBorderColor) => onUpdate({ triggerBorderColor })}
            onClear={() => clearColor('triggerBorderColor')}
          />
          <OptionalColorField
            label="ფონი"
            value={s.triggerBackground}
            onChange={(triggerBackground) => onUpdate({ triggerBackground })}
            onClear={() => clearColor('triggerBackground')}
          />
        </div>
      </InspectorFold>

      <InspectorFold title="ძიების ველი">
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="სიმაღლე"
            value={s.inputHeight}
            min={32}
            max={96}
            onCommit={(inputHeight) =>
              onUpdate({ inputHeight: clampPx(inputHeight, DEFAULT_SEARCH.inputHeight, 32, 96) })
            }
          />
          <NumField
            label="შრიფტი"
            value={s.inputFontSize}
            min={10}
            max={24}
            onCommit={(inputFontSize) =>
              onUpdate({
                inputFontSize: clampFontSize(inputFontSize, DEFAULT_SEARCH.inputFontSize, 10, 24),
              })
            }
          />
          <NumField
            label="რადიუსი"
            value={s.inputBorderRadius}
            min={0}
            max={48}
            onCommit={(inputBorderRadius) =>
              onUpdate({
                inputBorderRadius: clampRailRadius(
                  inputBorderRadius,
                  DEFAULT_SEARCH.inputBorderRadius
                ),
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <OptionalColorField
            label="საზღვარი"
            value={s.inputBorderColor}
            onChange={(inputBorderColor) => onUpdate({ inputBorderColor })}
            onClear={() => clearColor('inputBorderColor')}
          />
          <OptionalColorField
            label="ფონი"
            value={s.inputBackground}
            onChange={(inputBackground) => onUpdate({ inputBackground })}
            onClear={() => clearColor('inputBackground')}
          />
        </div>
      </InspectorFold>

      <InspectorFold title="გაფართოებული ძიება">
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="სიმაღლე"
            value={s.buttonHeight}
            min={32}
            max={96}
            onCommit={(buttonHeight) =>
              onUpdate({ buttonHeight: clampPx(buttonHeight, DEFAULT_SEARCH.buttonHeight, 32, 96) })
            }
          />
          <NumField
            label="შრიფტი"
            value={s.buttonFontSize}
            min={10}
            max={24}
            onCommit={(buttonFontSize) =>
              onUpdate({
                buttonFontSize: clampFontSize(
                  buttonFontSize,
                  DEFAULT_SEARCH.buttonFontSize,
                  10,
                  24
                ),
              })
            }
          />
          <NumField
            label="სიმუქე"
            value={s.buttonFontWeight}
            min={400}
            max={800}
            onCommit={(buttonFontWeight) =>
              onUpdate({
                buttonFontWeight: clampFontWeight(
                  buttonFontWeight,
                  DEFAULT_SEARCH.buttonFontWeight
                ),
              })
            }
          />
          <NumField
            label="pad X"
            value={s.buttonPadX}
            min={4}
            max={40}
            onCommit={(buttonPadX) =>
              onUpdate({ buttonPadX: clampPx(buttonPadX, DEFAULT_SEARCH.buttonPadX, 4, 40) })
            }
          />
          <NumField
            label="რადიუსი"
            value={s.buttonBorderRadius}
            min={0}
            max={48}
            onCommit={(buttonBorderRadius) =>
              onUpdate({
                buttonBorderRadius: clampRailRadius(
                  buttonBorderRadius,
                  DEFAULT_SEARCH.buttonBorderRadius
                ),
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <OptionalColorField
            label="ტექსტი"
            value={s.buttonColor}
            onChange={(buttonColor) => onUpdate({ buttonColor })}
            onClear={() => clearColor('buttonColor')}
          />
          <OptionalColorField
            label="საზღვარი"
            value={s.buttonBorderColor}
            onChange={(buttonBorderColor) => onUpdate({ buttonBorderColor })}
            onClear={() => clearColor('buttonBorderColor')}
          />
          <OptionalColorField
            label="ფონი"
            value={s.buttonBackground}
            onChange={(buttonBackground) => onUpdate({ buttonBackground })}
            onClear={() => clearColor('buttonBackground')}
          />
        </div>
      </InspectorFold>

      <button
        type="button"
        onClick={() => onUpdate({ ...DEFAULT_SEARCH })}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        სერჩის ნაგულისხმევზე დაბრუნება
      </button>
    </div>
  );
}

function OptionalColorField({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <ColorField label={label} value={value || '#64748b'} onChange={onChange} />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[9px] font-semibold text-slate-500 hover:text-red-600 dark:text-zinc-400"
        >
          ნაგულისხმევი ფერი
        </button>
      ) : (
        <p className="text-[9px] text-slate-400">ნაგულისხმევი</p>
      )}
    </div>
  );
}

function NumGrid({
  values,
  onChange,
}: {
  values: { x: number; y: number; w: number; h: number };
  onChange: (patch: Partial<{ x: number; y: number; w: number; h: number }>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumField label="X" value={values.x} paramKey="x" onCommit={(x) => onChange({ x })} />
      <NumField label="Y" value={values.y} paramKey="y" onCommit={(y) => onChange({ y })} />
      <NumField label="W" value={values.w} min={40} paramKey="w" onCommit={(w) => onChange({ w })} />
      <NumField label="H" value={values.h} min={40} paramKey="h" onCommit={(h) => onChange({ h })} />
    </div>
  );
}

function formatNumFieldValue(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return '0';
  if (decimals <= 0) return String(Math.round(n));
  const f = 10 ** decimals;
  const rounded = Math.round(n * f) / f;
  return String(rounded);
}

function NumField({
  label,
  value,
  onCommit,
  min,
  max,
  decimals = 0,
  paramKey,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  /** Allow fractional input (e.g. 1 = tenths for %). Default 0 = integers only. */
  decimals?: number;
  /** When set, highlights while canvas drag touches this param */
  paramKey?: import('@/components/home-design/HomeDesignContext').DesignEditParam;
}) {
  const design = useHomeDesignOptional();
  const active = Boolean(paramKey && design?.activeEditParams.includes(paramKey));
  const [draft, setDraft] = React.useState(() => formatNumFieldValue(value, decimals));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setDraft(formatNumFieldValue(value, decimals));
  }, [value, focused, decimals]);

  const commitFromRaw = (raw: string) => {
    const parsed = Number(raw.trim().replace(',', '.'));
    let next = Number.isFinite(parsed) ? parsed : value;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (decimals <= 0) next = Math.round(next);
    else {
      const f = 10 ** decimals;
      next = Math.round(next * f) / f;
    }
    setDraft(formatNumFieldValue(next, decimals));
    const prev =
      decimals <= 0 ? Math.round(value) : Math.round(value * 10 ** decimals) / 10 ** decimals;
    if (next !== prev) onCommit(next);
  };

  const draftPattern =
    decimals > 0 ? /^-?\d*(?:[.,]\d*)?$/ : /^-?\d*$/;

  return (
    <label
      data-edit-param={paramKey || undefined}
      className={`block text-[10px] font-medium uppercase tracking-wide transition-shadow ${
        active
          ? 'rounded-md bg-blue-50 p-1.5 text-blue-700 ring-2 ring-blue-500 dark:bg-blue-950/50 dark:text-blue-200'
          : 'text-slate-500 dark:text-zinc-400'
      }`}
    >
      {label}
      {active ? (
        <span className="ml-1 text-[9px] font-bold normal-case text-blue-600 dark:text-blue-300">
          ← იცვლება
        </span>
      ) : null}
      <input
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        className={`mt-0.5 w-full rounded-md border px-2 py-1 text-sm dark:bg-zinc-950 dark:text-zinc-100 ${
          active
            ? 'border-blue-400 text-blue-900 dark:border-blue-500 dark:text-blue-100'
            : 'border-slate-200 text-slate-800 dark:border-zinc-600'
        }`}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '' || raw === '-' || draftPattern.test(raw)) setDraft(raw);
        }}
        onBlur={(e) => {
          setFocused(false);
          commitFromRaw(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onCommit,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const safeValue = value ?? '';
  const [draft, setDraft] = React.useState(safeValue);
  const focusedRef = React.useRef(false);
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(safeValue);
  }, [safeValue]);

  const commitDraft = (raw: string) => {
    const next = raw;
    setDraft(next);
    if (next !== safeValue) onCommitRef.current(next);
  };

  return (
    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
      {label}
      <input
        type="text"
        className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        value={draft}
        placeholder={placeholder}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          focusedRef.current = false;
          commitDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const safeValue = value ?? '';
  const [draft, setDraft] = React.useState(safeValue);
  const focusedRef = React.useRef(false);
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(safeValue);
  }, [safeValue]);

  const commitDraft = (raw: string) => {
    const next = raw;
    setDraft(next);
    if (next !== safeValue) onCommitRef.current(next);
  };

  return (
    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
      {label}
      <textarea
        rows={3}
        className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          focusedRef.current = false;
          commitDraft(e.target.value);
        }}
      />
    </label>
  );
}
