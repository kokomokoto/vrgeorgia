'use client';

import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { isAdminRole, isAgentRole } from '@/lib/userRoles';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { DesignableBadge } from '@/components/home-design/DesignableBadge';
import {
  DEFAULT_HEADER,
  HEADER_ITEM_IDS,
  HEADER_ITEM_GAP_PX_DEFAULT,
  clampHeaderItemGapPx,
  clampOpacity,
  clampRailPercent,
  fitHeaderItemPositions,
  HEADER_PACK_REF_WIDTH,
  headerFreeLayoutIsCramped,
  headerHasFreeLayout,
  headerItemPadPxById,
  headerPositionsEqual,
  resolveHeaderItemNoOverlap,
  resolveHeaderItemPos,
  syncHeaderAccountSlotPositions,
  type HeaderItemId,
  type HeaderItemPos,
  type HeaderItemSizePct,
  type HeaderLayout,
} from '@/lib/homeDesignLayout';
import {
  liveHeaderOverlapOpts,
  measureHeaderItemSizes,
  seedVisibleHeaderPositions,
} from '@/lib/headerCanvasMeasure';
import {
  clearDesignSnapGuides,
  collectDesignSnapTargets,
  rectFromValues,
  setDesignSnapGuides,
  snapRectToTargets,
} from '@/lib/designSnap';
import { resolveActiveThemeMode } from '@/lib/themeModes';
import { resolveHeroImageUrls, revokeHeroUrls } from '@/lib/heroImageStorage';
import { clearHomeFiltersStorage } from '@/lib/homeFiltersStorage';
import {
  externalMediaDisplayUrl,
  type DesignMediaKind,
} from '@/lib/designMedia';
import { scaleDesignPx, useHomeDesignScale, DESIGN_WIDE_MIN_WIDTH } from '@/lib/useIsDesignDesktop';

const DRAG_THRESHOLD_PX = 3;

type HeaderBgMedia = {
  url?: string;
  kind?: DesignMediaKind;
  embedUrl?: string;
};

function useHeaderBgMedia(
  imageId?: string,
  mediaUrl?: string,
  mediaKind?: DesignMediaKind
): HeaderBgMedia | null {
  const [blob, setBlob] = React.useState<{ url: string; kind: DesignMediaKind } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string; kind: DesignMediaKind }[] = [];
    void (async () => {
      if (!imageId) {
        if (!cancelled) setBlob(null);
        return;
      }
      loaded = await resolveHeroImageUrls([imageId]);
      if (cancelled) {
        revokeHeroUrls(loaded);
        return;
      }
      const entry = loaded[0];
      setBlob(entry ? { url: entry.url, kind: entry.kind } : null);
    })();
    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageId]);

  return React.useMemo(() => {
    if (mediaUrl) {
      const kind = mediaKind || 'image';
      const display = externalMediaDisplayUrl(kind, mediaUrl);
      return { url: display.url, kind, embedUrl: display.embedUrl };
    }
    if (imageId && blob) {
      return {
        url: blob.url,
        kind: blob.kind,
        embedUrl: blob.kind === 'video' ? blob.url : undefined,
      };
    }
    return null;
  }, [mediaUrl, mediaKind, imageId, blob]);
}

function HeaderBackgroundMedia({ media }: { media: HeaderBgMedia }) {
  if (media.kind === 'video' && media.embedUrl?.includes('youtube.com/embed')) {
    const src = media.embedUrl.includes('autoplay')
      ? media.embedUrl
      : `${media.embedUrl}${media.embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0`;
    return (
      <iframe
        src={src}
        title=""
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 border-0"
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

  if (!media.url) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${media.url})` }}
      aria-hidden
    />
  );
}

function resolveHeaderItemTextStyle(
  header: HeaderLayout | undefined,
  id: HeaderItemId
): React.CSSProperties {
  const custom = header?.itemStyles?.[id];
  const opacity = clampOpacity(custom?.opacity);
  if (id === 'brand') {
    const fontSize = custom?.fontSize ?? header?.brandFontSize ?? DEFAULT_HEADER.brandFontSize;
    const color = custom?.color?.trim() || header?.brandColor?.trim() || '';
    return {
      fontSize,
      ...(color ? { color } : {}),
      opacity,
    };
  }
  const fontSize = custom?.fontSize ?? header?.navFontSize ?? DEFAULT_HEADER.navFontSize;
  const color = custom?.color?.trim() || header?.navColor?.trim() || '';
  return {
    fontSize,
    ...(color ? { color } : {}),
    opacity,
  };
}

function useHeaderItemDrag(enabled: boolean) {
  const design = useHomeDesignOptional();
  const designRef = React.useRef(design);
  designRef.current = design;
  const dragRef = React.useRef<{
    itemId: HeaderItemId;
    host: HTMLElement;
    el: HTMLElement;
    pointerId: number;
    box: DOMRect;
    sizes: Partial<Record<HeaderItemId, HeaderItemSizePct>>;
    /** Pointer offset from item center, as % of header bar */
    grabDxPct: number;
    grabDyPct: number;
    startClientX: number;
    startClientY: number;
    /** Y locked at pointer-down (Shift = horizontal-only drag) */
    lockY: number;
    /** X locked at pointer-down (Alt = vertical-only drag) */
    lockX: number;
    historyStarted: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    const overlapOpts = (
      box: DOMRect,
      sizes: Partial<Record<HeaderItemId, HeaderItemSizePct>>,
      axisLock?: 'x' | 'y' | null
    ) => {
      const header = designRef.current?.layout.header;
      return {
        sizes,
        visibleIds: HEADER_ITEM_IDS.filter((id) => Boolean(sizes[id])),
        gapPx: clampHeaderItemGapPx(header?.itemGapPx, HEADER_ITEM_GAP_PX_DEFAULT),
        padPxById: headerItemPadPxById(header?.itemStyles),
        barW: box.width,
        barH: box.height,
        axisLock: axisLock ?? null,
      };
    };

    const applyDragPoint = (
      clientX: number,
      clientY: number,
      shiftKey: boolean,
      altKey: boolean,
      ctrlKey: boolean
    ) => {
      const designNow = designRef.current;
      if (!designNow || !dragRef.current) return;
      const drag = dragRef.current;
      const dist = Math.hypot(clientX - drag.startClientX, clientY - drag.startClientY);
      if (!drag.historyStarted) {
        if (dist < DRAG_THRESHOLD_PX) return;
        drag.historyStarted = true;
        designNow.beginHistoryGesture();
      }
      const box = drag.host.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      drag.box = box;
      const sizes = measureHeaderItemSizes(drag.host, box);
      drag.sizes = sizes;
      const axisLock: 'x' | 'y' | null = shiftKey ? 'x' : altKey ? 'y' : null;
      let x = clampRailPercent(((clientX - box.left) / box.width) * 100 - drag.grabDxPct, 50);
      let y = clampRailPercent(((clientY - box.top) / box.height) * 100 - drag.grabDyPct, 50);
      if (axisLock === 'x') y = drag.lockY;
      if (axisLock === 'y') x = drag.lockX;
      if (!ctrlKey) {
        const size = sizes[drag.itemId];
        const w = size ? (size.wPct / 100) * box.width : 1;
        const h = size ? (size.hPct / 100) * box.height : 1;
        const cx = box.left + (x / 100) * box.width;
        const cy = box.top + (y / 100) * box.height;
        const snap = snapRectToTargets(
          rectFromValues(drag.itemId, cx - w / 2, cy - h / 2, Math.max(w, 1), Math.max(h, 1)),
          collectDesignSnapTargets('header', { headerItem: drag.itemId })
        );
        x = clampRailPercent(((cx + snap.dx - box.left) / box.width) * 100, 50);
        y = clampRailPercent(((cy + snap.dy - box.top) / box.height) * 100, 50);
        if (axisLock === 'x') y = drag.lockY;
        if (axisLock === 'y') x = drag.lockX;
        setDesignSnapGuides(snap.guides);
      } else {
        clearDesignSnapGuides();
      }
      const seeded = seedVisibleHeaderPositions(
        designNow.layout.header.itemPositions,
        drag.host
      );
      seeded[drag.itemId] = resolveHeaderItemNoOverlap(
        drag.itemId,
        { x, y },
        seeded,
        overlapOpts(box, sizes, axisLock)
      );
      const visibleIds = HEADER_ITEM_IDS.filter((id) => Boolean(sizes[id]));
      designNow.updateHeader({
        itemPositions: syncHeaderAccountSlotPositions(seeded, visibleIds),
      });
    };

    const finishDrag = (pointerId?: number) => {
      const designNow = designRef.current;
      if (!designNow || !dragRef.current) return;
      const drag = dragRef.current;
      if (pointerId !== undefined && drag.pointerId !== pointerId) return;
      if (drag.historyStarted) {
        const box = drag.host.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) {
          const sizes = measureHeaderItemSizes(drag.host, box);
          const prev = designNow.layout.header.itemPositions || {};
          const current = prev[drag.itemId];
          if (current) {
            const seeded = seedVisibleHeaderPositions(prev, drag.host);
            seeded[drag.itemId] = resolveHeaderItemNoOverlap(
              drag.itemId,
              current,
              seeded,
              overlapOpts(box, sizes, null)
            );
            const visibleIds = HEADER_ITEM_IDS.filter((id) => Boolean(sizes[id]));
            designNow.updateHeader({
              itemPositions: syncHeaderAccountSlotPositions(seeded, visibleIds),
            });
          }
        }
        designNow.endHistoryGesture();
      }
      try {
        drag.el.releasePointerCapture(drag.pointerId);
      } catch {
        /* already released */
      }
      dragRef.current = null;
      designNow.setActiveEditParams([]);
      clearDesignSnapGuides();
    };

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      e.preventDefault();
      applyDragPoint(e.clientX, e.clientY, e.shiftKey, e.altKey, e.ctrlKey);
    };
    const onUp = (e: PointerEvent) => {
      finishDrag(e.pointerId);
    };
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    window.addEventListener('lostpointercapture', onUp, { capture: true });
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
      window.removeEventListener('lostpointercapture', onUp, { capture: true });
    };
  }, [enabled]);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent, itemId: HeaderItemId) => {
      const designNow = designRef.current;
      if (!enabled || !designNow) return;
      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current && !dragRef.current.historyStarted) {
        dragRef.current = null;
      }
      const host = (e.currentTarget as HTMLElement).closest('[data-header-canvas]');
      if (!(host instanceof HTMLElement)) return;
      const box = host.getBoundingClientRect();
      const start = resolveHeaderItemPos(designNow.layout.header.itemPositions, itemId);
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      dragRef.current = {
        itemId,
        host,
        el,
        pointerId: e.pointerId,
        box,
        sizes: measureHeaderItemSizes(host, box),
        grabDxPct: box.width > 0 ? ((e.clientX - centerX) / box.width) * 100 : 0,
        grabDyPct: box.height > 0 ? ((e.clientY - centerY) / box.height) * 100 : 0,
        startClientX: e.clientX,
        startClientY: e.clientY,
        lockY: start.y,
        lockX: start.x,
        historyStarted: false,
      };
      designNow.setActiveEditParams(['posX', 'posY']);
      if (itemId === 'theme') {
        // Theme toggle opens the modes/colors editor (emoji + media), not header chrome.
        designNow.setSelectedId('theme');
        designNow.setSelectedHeaderItemId(null);
      } else {
        designNow.setSelectedId('header');
        designNow.setSelectedHeaderItemId(itemId);
      }
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture can fail on synthetic / already-released pointers */
      }
    },
    [enabled]
  );

  return { onPointerDown, dragRef };
}

function HeaderFreeItem({
  itemId,
  pos,
  designMode,
  selected,
  drag,
  children,
  className,
  style,
  as: Comp = 'div',
  href,
  onClick,
}: {
  itemId: HeaderItemId;
  pos: HeaderItemPos;
  designMode: boolean;
  selected?: boolean;
  drag: ReturnType<typeof useHeaderItemDrag>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'a' | typeof Link;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const commonClass = `pointer-events-auto ${className || ''} ${
    designMode
      ? `cursor-grab touch-none select-none ring-1 active:cursor-grabbing ${
          selected ? 'ring-2 ring-blue-600' : 'ring-blue-400/60'
        }`
      : ''
  }`.trim();

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${pos.x}%`,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    height: 36,
    lineHeight: 1,
    // Stable paint order by X — avoid one label permanently covering another when near
    zIndex: selected ? 40 : 5 + Math.round(pos.x),
    whiteSpace: 'nowrap',
    ...style,
  };

  const dragHandlers = designMode
    ? {
        onPointerDown: (e: React.PointerEvent) => drag.onPointerDown(e, itemId),
        // <a>/<Link> is draggable by default — native URL-drag steals the gesture.
        draggable: false,
        onDragStart: (e: React.DragEvent) => e.preventDefault(),
      }
    : {};

  const content = designMode ? (
    <span className="pointer-events-none">{children}</span>
  ) : (
    children
  );

  if (Comp === Link || Comp === 'a') {
    const Tag = Comp === Link ? Link : 'a';
    return (
      <Tag
        href={href || '#'}
        data-header-item={itemId}
        className={commonClass}
        style={commonStyle}
        onClick={onClick}
        {...dragHandlers}
      >
        {content}
      </Tag>
    );
  }

  return (
    <div
      data-header-item={itemId}
      className={commonClass}
      style={commonStyle}
      onClick={onClick}
      {...dragHandlers}
    >
      {content}
    </div>
  );
}

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, profileLoaded } = useAuth();
  const { theme, activeModeId } = useTheme();
  const design = useHomeDesignOptional();
  const designMode = design?.designMode ?? false;
  const selected = design?.selectedId === 'header';
  const selectedHeaderItemId = design?.selectedHeaderItemId ?? null;
  const headerLayout = design?.layout.header;

  const activeThemeMode = React.useMemo(() => {
    const modes = design?.layout.themeModes;
    if (!modes?.length) return null;
    return resolveActiveThemeMode(modes, activeModeId, theme);
  }, [design?.layout.themeModes, activeModeId, theme]);

  const headerBgMedia = useHeaderBgMedia(
    activeThemeMode?.headerBgImageId,
    activeThemeMode?.headerBgMediaUrl,
    activeThemeMode?.headerBgMediaKind
  );
  const hasHeaderMedia = Boolean(headerBgMedia?.url || headerBgMedia?.embedUrl);

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const headerHRaw = headerLayout?.h ?? DEFAULT_HEADER.h;
  const designScale = useHomeDesignScale(1280);
  const typeScale = useHomeDesignScale(HEADER_PACK_REF_WIDTH);
  const fontScale = typeScale;
  const headerH = scaleDesignPx(headerHRaw, designScale, 36);
  const itemPositions = headerLayout?.itemPositions;
  const freeLayoutUsable =
    headerHasFreeLayout(itemPositions) && !headerFreeLayoutIsCramped(itemPositions);
  const [navOverflow, setNavOverflow] = React.useState(false);
  const navOverflowRef = React.useRef(false);
  /**
   * Same nav mode as the public page so Design Mode is WYSIWYG.
   * Drag still works when free layout is what visitors see.
   */
  const useFreeNav = freeLayoutUsable && !navOverflow;
  const drag = useHeaderItemDrag(designMode);
  const itemPadKey = JSON.stringify(headerItemPadPxById(headerLayout?.itemStyles));
  const designRef = React.useRef(design);
  designRef.current = design;
  const [publicPositions, setPublicPositions] = React.useState<
    Partial<Record<HeaderItemId, HeaderItemPos>> | undefined
  >(undefined);

  const selectHeaderRoot = React.useCallback(() => {
    design?.setSelectedId('header');
    design?.setSelectedHeaderItemId(null);
  }, [design]);

  const selectHeaderItem = React.useCallback(
    (itemId: HeaderItemId) => {
      design?.setSelectedId('header');
      design?.setSelectedHeaderItemId(itemId);
    },
    [design]
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--site-header-height', `${headerH}px`);
    return () => {
      document.documentElement.style.removeProperty('--site-header-height');
    };
  }, [headerH]);

  const heightDragRef = React.useRef<{
    startY: number;
    origH: number;
    historyStarted: boolean;
  } | null>(null);

  const onHeightPointerDown = (e: React.PointerEvent) => {
    if (!design || !designMode) return;
    e.preventDefault();
    e.stopPropagation();
    selectHeaderRoot();
    design.setActiveEditParams(['headerH']);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    heightDragRef.current = {
      startY: e.clientY,
      origH: headerHRaw,
      historyStarted: false,
    };
  };

  const onHeightPointerMove = (e: React.PointerEvent) => {
    const d = heightDragRef.current;
    if (!d || !design) return;
    const dy = e.clientY - d.startY;
    if (!d.historyStarted) {
      if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      design.beginHistoryGesture();
      d.historyStarted = true;
    }
    const rawDy = dy / Math.max(designScale, 0.05);
    design.updateHeader({ h: d.origH + rawDy });
  };

  const onHeightPointerUp = (e: React.PointerEvent) => {
    if (!heightDragRef.current || !design) return;
    const started = heightDragRef.current.historyStarted;
    heightDragRef.current = null;
    design.setActiveEditParams([]);
    if (started) design.endHistoryGesture();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (designMode) {
      e.preventDefault();
      e.stopPropagation();
      selectHeaderItem('brand');
      return;
    }
    e.preventDefault();
    // ლოგო = ახალი ძიება — შენახული ფილტრები/სორტი იშლება
    clearHomeFiltersStorage();
    window.location.href = '/';
  };

  const appName = headerLayout?.brandLabel?.trim() || 'Vhome';
  const uploadText =
    headerLayout?.uploadLabel?.trim() || (mounted ? t('upload') : 'განცხადების დამატება');
  const loginText =
    headerLayout?.loginLabel?.trim() || (mounted ? t('login') : 'შესვლა');
  const favoritesText =
    headerLayout?.favoritesLabel?.trim() || (mounted ? t('favorites') : 'ფავორიტები');
  const compareText =
    headerLayout?.compareLabel?.trim() || (mounted ? t('compare') : 'შედარება');
  const agentsText =
    headerLayout?.agentsLabel?.trim() || (mounted ? t('agents') : 'აგენტები');
  const servicesNavText =
    headerLayout?.servicesLabel?.trim() || (mounted ? t('services_nav') : 'მომსახურება');
  const aboutNavText =
    headerLayout?.aboutLabel?.trim() || (mounted ? t('about_nav') : 'შესახებ');
  const profileText =
    headerLayout?.profileLabel?.trim() || (mounted ? t('profile') : 'პროფილი');
  const adminText =
    headerLayout?.adminLabel?.trim() || (mounted ? t('admin_panel') : 'ადმინ პანელი');
  const isAdmin = profileLoaded && isAdminRole(user?.role);
  const isAgent = profileLoaded && isAgentRole(user?.role);

  React.useLayoutEffect(() => {
    if (!freeLayoutUsable) {
      navOverflowRef.current = false;
      setNavOverflow(false);
      setPublicPositions(undefined);
      return;
    }
    let cancelled = false;
    let raf = 0;
    let emptyTries = 0;
    const run = () => {
      if (cancelled) return;
      if (designMode && drag.dragRef.current?.historyStarted) return;
      if (window.innerWidth < DESIGN_WIDE_MIN_WIDTH) return;
      const header = designRef.current?.layout.header;
      const opts = liveHeaderOverlapOpts(header);
      if (!opts?.visibleIds?.length) {
        if (!navOverflowRef.current && emptyTries < 10) {
          emptyTries += 1;
          raf = requestAnimationFrame(run);
        }
        return;
      }
      emptyTries = 0;
      const host = document.querySelector('[data-header-canvas]');
      if (!(host instanceof HTMLElement)) return;
      const box = host.getBoundingClientRect();
      if (box.width <= 0) return;
      const seeded = seedVisibleHeaderPositions(header?.itemPositions, host);
      if (!user && seeded.profile) {
        seeded.login = { ...seeded.profile };
      }
      const fitted = fitHeaderItemPositions(seeded, opts);
      if (!fitted.fits) {
        navOverflowRef.current = true;
        setNavOverflow(true);
        setPublicPositions(undefined);
        return;
      }
      if (navOverflowRef.current) {
        navOverflowRef.current = false;
        setNavOverflow(false);
      }
      setPublicPositions((prev) =>
        headerPositionsEqual(prev, fitted.positions) ? prev : fitted.positions
      );
    };
    run();
    const schedule = () => {
      navOverflowRef.current = false;
      setNavOverflow(false);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(run);
      });
    };
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    void document.fonts?.ready?.then(() => {
      if (!cancelled) schedule();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [
    designMode,
    freeLayoutUsable,
    user,
    isAdmin,
    profileLoaded,
    itemPositions,
    itemPadKey,
    headerHRaw,
    headerLayout?.itemGapPx,
    i18n.language,
    mounted,
    typeScale,
    fontScale,
  ]);

  const brandFontSize = scaleDesignPx(
    headerLayout?.brandFontSize ?? DEFAULT_HEADER.brandFontSize,
    fontScale,
    12
  );
  const navFontSize = scaleDesignPx(
    headerLayout?.navFontSize ?? DEFAULT_HEADER.navFontSize,
    fontScale,
    11
  );
  const brandColor = headerLayout?.brandColor?.trim() || '';
  const navColor = headerLayout?.navColor?.trim() || '';
  const navStyle: React.CSSProperties = {
    fontSize: navFontSize,
    ...(navColor ? { color: navColor } : {}),
  };
  const brandStyle: React.CSSProperties = {
    fontSize: brandFontSize,
    ...(brandColor ? { color: brandColor } : {}),
  };
  const itemStyle = (id: HeaderItemId) => {
    const base = resolveHeaderItemTextStyle(headerLayout, id);
    if (typeof base.fontSize === 'number') {
      return { ...base, fontSize: scaleDesignPx(base.fontSize, fontScale, 11) };
    }
    return base;
  };

  const onDesignItemClick = (itemId: HeaderItemId) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectHeaderItem(itemId);
  };

  const uploadLinkClass =
    isAgent || isAdmin
      ? 'font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
      : 'text-slate-800 hover:text-blue-700 dark:text-zinc-200 dark:hover:text-amber-400';

  const headerCssVars = {
    ...(navColor ? ({ ['--theme-header-text']: navColor } as React.CSSProperties) : {}),
    ...(brandColor ? ({ ['--theme-accent']: brandColor } as React.CSSProperties) : {}),
  };

  const pos = (id: HeaderItemId) => {
    const source = publicPositions || itemPositions;
    if (!designMode && !user && id === 'login') {
      const loginPos = resolveHeaderItemPos(source, 'login');
      const profilePos = source?.profile;
      if (profilePos && !publicPositions) return profilePos;
      return loginPos;
    }
    return resolveHeaderItemPos(source, id);
  };

  const freeNavItems = (
    <>
      <HeaderFreeItem
        itemId="brand"
        pos={pos('brand')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'brand'}
        drag={drag}
        as="a"
        href="/"
        onClick={handleLogoClick}
        className="font-semibold leading-none"
        style={itemStyle('brand')}
      >
        <span data-theme-brand>{appName}</span>
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="services"
        pos={pos('services')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'services'}
        drag={drag}
        as={Link}
        href="/services"
        className="flex items-center gap-1"
        style={itemStyle('services')}
        onClick={designMode ? onDesignItemClick('services') : undefined}
      >
        <span data-theme-nav className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          {servicesNavText}
        </span>
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="about"
        pos={pos('about')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'about'}
        drag={drag}
        as={Link}
        href="/about"
        style={itemStyle('about')}
        onClick={designMode ? onDesignItemClick('about') : undefined}
      >
        <span data-theme-nav>{aboutNavText}</span>
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="agents"
        pos={pos('agents')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'agents'}
        drag={drag}
        as={Link}
        href="/agents"
        className="flex items-center gap-1"
        style={itemStyle('agents')}
        onClick={designMode ? onDesignItemClick('agents') : undefined}
      >
        <span data-theme-nav className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {agentsText}
        </span>
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="upload"
        pos={pos('upload')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'upload'}
        drag={drag}
        as={Link}
        href="/upload"
        className={uploadLinkClass}
        style={
          isAgent || isAdmin
            ? { fontSize: itemStyle('upload').fontSize }
            : itemStyle('upload')
        }
        onClick={designMode ? onDesignItemClick('upload') : undefined}
      >
        {uploadText}
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="favorites"
        pos={pos('favorites')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'favorites'}
        drag={drag}
        as={Link}
        href="/favorites"
        className="flex items-center gap-1"
        style={itemStyle('favorites')}
        onClick={designMode ? onDesignItemClick('favorites') : undefined}
      >
        <span data-theme-nav className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {favoritesText}
        </span>
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="compare"
        pos={pos('compare')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'compare'}
        drag={drag}
        as={Link}
        href="/compare"
        className="flex items-center gap-1"
        style={itemStyle('compare')}
        onClick={designMode ? onDesignItemClick('compare') : undefined}
      >
        <span data-theme-nav className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {compareText}
        </span>
      </HeaderFreeItem>

      {!user ? (
        <HeaderFreeItem
          itemId="login"
          pos={pos('login')}
          designMode={designMode}
          selected={selectedHeaderItemId === 'login'}
          drag={drag}
          as={Link}
          href="/login"
          className="font-medium"
          style={itemStyle('login')}
          onClick={designMode ? onDesignItemClick('login') : undefined}
        >
          <span data-theme-nav>{loginText}</span>
        </HeaderFreeItem>
      ) : (
        <>
          <HeaderFreeItem
            itemId="profile"
            pos={pos('profile')}
            designMode={designMode}
            selected={selectedHeaderItemId === 'profile'}
            drag={drag}
            as={Link}
            href="/profile"
            className="font-medium"
            style={itemStyle('profile')}
            onClick={designMode ? onDesignItemClick('profile') : undefined}
          >
            <span data-theme-nav>{profileText}</span>
          </HeaderFreeItem>

          {isAdmin ? (
            <HeaderFreeItem
              itemId="admin"
              pos={pos('admin')}
              designMode={designMode}
              selected={selectedHeaderItemId === 'admin'}
              drag={drag}
              as={Link}
              href="/admin"
              className="flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
              style={{ fontSize: itemStyle('admin').fontSize }}
              onClick={designMode ? onDesignItemClick('admin') : undefined}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              {adminText}
            </HeaderFreeItem>
          ) : null}
        </>
      )}

      <HeaderFreeItem
        itemId="theme"
        pos={pos('theme')}
        designMode={designMode}
        selected={design?.selectedId === 'theme' || selectedHeaderItemId === 'theme'}
        drag={drag}
        style={itemStyle('theme')}
        onClick={
          designMode
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                design?.setSelectedId('theme');
                design?.setSelectedHeaderItemId(null);
              }
            : undefined
        }
      >
        <ThemeToggle />
      </HeaderFreeItem>

      <HeaderFreeItem
        itemId="language"
        pos={pos('language')}
        designMode={designMode}
        selected={selectedHeaderItemId === 'language'}
        drag={drag}
        style={itemStyle('language')}
        onClick={designMode ? onDesignItemClick('language') : undefined}
      >
        <span className={designMode ? 'pointer-events-none' : undefined}>
          <LanguageSwitcher />
        </span>
      </HeaderFreeItem>
    </>
  );

  return (
    <header
      data-site-header
      data-designable="header"
      data-header-canvas
      data-header-has-media={hasHeaderMedia ? 'true' : undefined}
      className="sticky top-0 z-40 box-border overflow-visible border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:backdrop-blur-md relative"
      style={{
        height: headerH,
        ...headerCssVars,
        opacity: clampOpacity(headerLayout?.opacity),
        outline: designMode
          ? selected
            ? '2px solid #2563eb'
            : '1px dashed #94a3b8'
          : undefined,
        outlineOffset: designMode ? -2 : undefined,
        cursor: designMode ? 'pointer' : undefined,
      }}
      onClick={
        designMode
          ? (e) => {
              if ((e.target as HTMLElement).closest('a, button, select, input, textarea, label')) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              selectHeaderRoot();
            }
          : undefined
      }
    >
      {hasHeaderMedia && headerBgMedia ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <HeaderBackgroundMedia media={headerBgMedia} />
          </div>
          <div data-header-bg-tint className="pointer-events-none absolute inset-0 z-[1]" aria-hidden />
        </>
      ) : null}

      {/* Free layout — xl+ only */}
      {useFreeNav ? (
        <div className="pointer-events-none absolute inset-0 z-[2] hidden xl:block">
          {designMode ? (
            <DesignableBadge id="header" selected={selected} placement="inside" />
          ) : null}
          {freeNavItems}
        </div>
      ) : null}

      {/* Classic flex — xl+ only (below xl: hamburger — no crushed nav) */}
      {!useFreeNav ? (
        <div className="relative z-[2] mx-auto hidden h-full max-w-6xl items-center justify-between gap-3 px-4 xl:flex">
          {designMode ? (
            <DesignableBadge id="header" selected={selected} placement="inside" />
          ) : null}
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <a
              href="/"
              onClick={handleLogoClick}
              data-theme-brand
              className={`cursor-pointer font-semibold leading-none ${
                designMode ? 'pointer-events-auto relative z-10 ring-1 ring-blue-400/50' : ''
              }`}
              style={brandStyle}
            >
              {appName}
            </a>
          </div>
          <nav
            className={`flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 ${
              designMode ? 'pointer-events-auto' : ''
            }`}
          >
            <Link href="/services" data-theme-nav className="flex items-center gap-1" style={navStyle}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {servicesNavText}
            </Link>
            <Link href="/about" data-theme-nav style={navStyle}>
              {aboutNavText}
            </Link>
            <Link href="/agents" data-theme-nav className="flex items-center gap-1" style={navStyle}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {agentsText}
            </Link>
            <Link
              href="/upload"
              className={uploadLinkClass}
              style={isAgent || isAdmin ? { fontSize: navFontSize } : navStyle}
              {...(isAgent || isAdmin ? {} : { 'data-theme-nav': true })}
            >
              {uploadText}
            </Link>
            <Link href="/favorites" data-theme-nav className="flex items-center gap-1" style={navStyle}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoritesText}
            </Link>
            <Link href="/compare" data-theme-nav className="flex items-center gap-1" style={navStyle}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {compareText}
            </Link>
            {!user ? (
              <Link href="/login" data-theme-nav className="font-medium" style={navStyle}>
                {loginText}
              </Link>
            ) : (
              <>
                <Link href="/profile" data-theme-nav className="font-medium" style={navStyle}>
                  {profileText}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                    style={{ fontSize: navFontSize }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {adminText}
                  </Link>
                )}
              </>
            )}
            <ThemeToggle />
            <LanguageSwitcher />
          </nav>
        </div>
      ) : null}

      {/* Compact bar — below xl (hamburger; avoids crushed classic/free nav) */}
      <div className="relative z-[2] mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 xl:hidden">
        {designMode ? (
          <DesignableBadge id="header" selected={selected} placement="inside" />
        ) : null}
        <a
          href="/"
          onClick={handleLogoClick}
          data-theme-brand
          className="cursor-pointer font-semibold leading-none"
          style={brandStyle}
        >
          {appName}
        </a>
        <div className="flex items-center gap-3">
          <span
            className={designMode ? 'cursor-pointer rounded-md ring-1 ring-blue-400/50' : undefined}
            onClick={
              designMode
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    design?.setSelectedId('theme');
                    design?.setSelectedHeaderItemId(null);
                  }
                : undefined
            }
          >
            <ThemeToggle />
          </span>
          <span
            className={designMode ? 'cursor-pointer rounded-md ring-1 ring-blue-400/50' : undefined}
            onClick={designMode ? onDesignItemClick('language') : undefined}
          >
            <LanguageSwitcher />
          </span>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            style={{ fontSize: navFontSize }}
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div
          data-theme-surface
          className="absolute left-0 right-0 top-full z-50 border-b border-t border-slate-200 bg-white shadow-lg xl:hidden dark:border-zinc-700 dark:bg-zinc-950"
          style={{ ...headerCssVars }}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            <Link href="/services" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
              {servicesNavText}
            </Link>
            <Link href="/about" data-theme-nav onClick={() => setOpen(false)} className="py-2" style={navStyle}>
              {aboutNavText}
            </Link>
            <Link href="/agents" data-theme-nav onClick={() => setOpen(false)} className="flex flex-row items-center gap-2 py-2" style={navStyle}>
              {agentsText}
            </Link>
            <Link
              href="/upload"
              onClick={() => setOpen(false)}
              className={`${uploadLinkClass} py-2`}
              style={isAgent || isAdmin ? { fontSize: navFontSize } : navStyle}
            >
              {uploadText}
            </Link>
            <Link href="/favorites" data-theme-nav onClick={() => setOpen(false)} className="py-2" style={navStyle}>
              {favoritesText}
            </Link>
            <Link href="/compare" data-theme-nav onClick={() => setOpen(false)} className="py-2" style={navStyle}>
              {compareText}
            </Link>
            {!user ? (
              <Link href="/login" data-theme-nav onClick={() => setOpen(false)} className="py-2 font-medium" style={navStyle}>
                {loginText}
              </Link>
            ) : (
              <>
                <Link href="/profile" data-theme-nav onClick={() => setOpen(false)} className="py-2 font-medium" style={navStyle}>
                  {profileText}
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="py-2 font-semibold text-rose-600" style={{ fontSize: navFontSize }}>
                    {adminText}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {designMode ? (
        <div
          className="absolute bottom-0 left-1/2 z-30 flex h-3 w-12 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-t-md bg-blue-600/80"
          title="ჰედერის სიმაღლე"
          onPointerDown={onHeightPointerDown}
          onPointerMove={onHeightPointerMove}
          onPointerUp={onHeightPointerUp}
          onPointerCancel={onHeightPointerUp}
        />
      ) : null}
    </header>
  );
}
