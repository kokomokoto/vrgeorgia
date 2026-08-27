'use client';

import React from 'react';
import { Designable } from '@/components/home-design/Designable';
import { DesignableBadge } from '@/components/home-design/DesignableBadge';
import { HeroSlideshow, HERO_W } from '@/components/home-design/HeroSlideshow';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { useTheme } from '@/components/ThemeProvider';
import {
  createDefaultThemeModes,
  getEnabledThemeModes,
  heroSlideshowIdsForMode,
  resolveActiveThemeMode,
} from '@/lib/themeModes';
import { useHomeDesignScale, scaleDesignPx } from '@/lib/useIsDesignDesktop';
import {
  HERO_H_MAX,
  HERO_H_MIN,
  HERO_MOBILE_H_DEFAULT,
  HERO_MOBILE_H_MAX,
  HERO_MOBILE_H_MIN,
  HERO_MOBILE_STACK_GAP_DEFAULT,
  clampOpacity,
} from '@/lib/homeDesignLayout';

const DRAG_THRESHOLD_PX = 3;

export function HomeHero({
  title,
  subtitle,
  dealBar,
  children,
}: {
  title: string;
  subtitle: string;
  /** Independent deal-type bar (outside search box) */
  dealBar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const design = useHomeDesignOptional();
  const { theme, activeModeId } = useTheme();
  const designMode = design?.designMode ?? false;
  const selected = design?.selectedId === 'hero';
  const search = design?.layout.search;
  const deal = design?.layout.dealBar;
  const hero = design?.layout.hero;
  const heroText = design?.layout.heroText;
  const searchW = search?.w ?? 1280;
  const searchHRaw = Math.min(120, search?.h ?? 88);
  const dealW = deal?.w ?? 480;
  const dealHRaw = Math.min(72, deal?.h ?? 48);
  const heroH = hero?.h ?? 360;
  const designCanvasW = Math.max(searchW, dealW, HERO_W, 1280);
  const designScale = useHomeDesignScale(designCanvasW);
  const searchH = scaleDesignPx(searchHRaw, designScale, 44);
  const dealH = scaleDesignPx(dealHRaw, designScale, 36);
  const mobileHeroH = Math.max(
    HERO_MOBILE_H_MIN,
    Math.min(HERO_MOBILE_H_MAX, hero?.mobileH ?? HERO_MOBILE_H_DEFAULT)
  );
  const mobileStackGap = Math.max(
    0,
    Math.min(32, hero?.mobileStackGap ?? HERO_MOBILE_STACK_GAP_DEFAULT)
  );
  const heroTextTitle = heroText?.title?.trim() ? heroText.title : title;
  const heroTextSubtitle = heroText?.subtitle?.trim() ? heroText.subtitle : subtitle;

  /** Desktop sizes via CSS `md:`; phone uses the stacked defaults below md. */
  const titleFontSize = scaleDesignPx(heroText?.titleFontSize ?? 32, designScale, 14);
  const subtitleFontSize = scaleDesignPx(heroText?.subtitleFontSize ?? 14, designScale, 10);
  const titleColor = heroText?.titleColor ?? '#ffffff';
  const subtitleColor = heroText?.subtitleColor ?? '#e5e5e5';

  const { slideshowModeId, imageIds } = React.useMemo(() => {
    const modes =
      design?.layout.themeModes?.length
        ? design.layout.themeModes
        : createDefaultThemeModes();
    const enabled = getEnabledThemeModes(modes);
    const active = resolveActiveThemeMode(enabled, activeModeId, theme);
    return {
      slideshowModeId: active.id,
      imageIds: heroSlideshowIdsForMode(active),
    };
  }, [design?.layout.themeModes, activeModeId, theme]);

  const intervalSec = hero?.intervalSec ?? 6;
  const transition = hero?.transition ?? 'fade-slow';

  const dragRef = React.useRef<{
    startY: number;
    origH: number;
    mode: 'desktop' | 'mobile';
    historyStarted: boolean;
  } | null>(null);

  const onHeightPointerDown = (e: React.PointerEvent, mode: 'desktop' | 'mobile') => {
    if (!design || !designMode) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('hero');
    design.setSelectedTypeItemId?.(null);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = {
      startY: e.clientY,
      origH: mode === 'desktop' ? heroH : mobileHeroH,
      mode,
      historyStarted: false,
    };
  };

  const onHeightPointerMove = (e: React.PointerEvent) => {
    if (!design || !dragRef.current) return;
    const d = dragRef.current;
    const dy = e.clientY - d.startY;
    if (!d.historyStarted) {
      if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      design.beginHistoryGesture();
      d.historyStarted = true;
    }
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : HERO_W;
    if (d.mode === 'desktop') {
      const scale = HERO_W / Math.max(1, viewportW);
      const nextH = Math.max(HERO_H_MIN, Math.min(HERO_H_MAX, Math.round(d.origH + dy * scale)));
      design.updateHero({ h: nextH });
      return;
    }
    const nextH = Math.max(
      HERO_MOBILE_H_MIN,
      Math.min(HERO_MOBILE_H_MAX, Math.round(d.origH + dy))
    );
    design.updateHero({ mobileH: nextH });
  };

  const onHeightPointerUp = (e: React.PointerEvent) => {
    if (!design || !dragRef.current) return;
    const started = dragRef.current.historyStarted;
    dragRef.current = null;
    if (started) design.endHistoryGesture();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const selectHero = designMode
    ? (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-designable="heroText"]')) return;
        e.preventDefault();
        e.stopPropagation();
        design?.setSelectedId('hero');
      }
    : undefined;

  const heroOutline = designMode
    ? selected
      ? '2px solid #2563eb'
      : '1px dashed #94a3b8'
    : undefined;

  const titleBlock = (
    <Designable id="heroText" className="max-w-[calc(100%-1.5rem)] px-0 sm:px-0">
      <div className="flex max-w-full flex-col justify-start">
        <h1
          className="font-serif font-semibold tracking-tight [font-size:26px] md:[font-size:var(--hero-title-fs)]"
          style={
            {
              '--hero-title-fs': `${titleFontSize}px`,
              color: titleColor,
              lineHeight: 1.2,
            } as React.CSSProperties
          }
        >
          {heroTextTitle}
        </h1>
        <p
          className="mt-1.5 leading-relaxed [font-size:13px] md:[font-size:var(--hero-sub-fs)]"
          style={
            {
              '--hero-sub-fs': `${subtitleFontSize}px`,
              color: subtitleColor,
            } as React.CSSProperties
          }
        >
          {heroTextSubtitle}
        </p>
      </div>
    </Designable>
  );

  const dealAndSearch = (
    <>
      {dealBar ? (
        <Designable id="dealBar" className="max-w-full">
          <div
            className="box-border flex w-full max-w-full items-center justify-center max-md:min-h-11 md:max-w-[var(--deal-w)] md:min-h-[var(--deal-h)]"
            style={
              {
                width: '100%',
                height: 'auto',
                '--deal-h': `${dealH}px`,
                '--deal-w': `${dealW}px`,
              } as React.CSSProperties
            }
          >
            {dealBar}
          </div>
        </Designable>
      ) : null}

      <Designable id="search" className="relative z-50 mx-auto w-full overflow-visible">
        <div
          className={`relative box-border w-full overflow-visible max-md:block md:flex md:min-h-[var(--search-h)] md:items-stretch md:border md:px-[var(--search-px)] md:py-[var(--search-py)] md:shadow-lg ${
            search?.borderColor ? '' : 'md:border-white/30 dark:md:border-zinc-600'
          }`}
          style={
            {
              width: '100%',
              height: 'auto',
              '--search-h': `${searchH}px`,
              '--search-px': `${scaleDesignPx(search?.padX ?? 10, designScale, 6)}px`,
              '--search-py': `${scaleDesignPx(search?.padY ?? 8, designScale, 6)}px`,
              borderRadius: search?.borderRadius ?? 12,
              ...(search?.borderColor ? { borderColor: search.borderColor } : null),
            } as React.CSSProperties
          }
        >
          <div
            className={`pointer-events-none absolute inset-0 -z-0 hidden rounded-[inherit] backdrop-blur-sm md:block ${
              search?.background ? '' : 'bg-white/95 dark:bg-zinc-950/90'
            }`}
            style={search?.background ? { backgroundColor: search.background } : undefined}
            aria-hidden
          />
          <div className="relative z-10 w-full max-md:block md:flex md:h-full md:min-h-0 md:items-center md:overflow-visible">
            {children}
          </div>
        </div>
      </Designable>
    </>
  );

  /*
   * One DOM tree for phone + desktop. CSS `md:` places title/search on the photo
   * from the first paint — no wait for useIsDesignDesktop() (which starts false).
   */
  return (
    <section className="relative z-30 w-full overflow-visible">
      <div
        className="relative isolate grid w-full grid-cols-1 grid-rows-[auto_auto] md:block md:aspect-[var(--hero-ar)] md:min-h-0 md:overflow-visible"
        style={
          {
            '--mobile-hero-h': `${mobileHeroH}px`,
            '--hero-ar': `${HERO_W} / ${heroH}`,
            '--hero-content-w': `${Math.max(searchW, 1280)}px`,
            outline: heroOutline,
            outlineOffset: designMode ? -1 : undefined,
          } as React.CSSProperties
        }
        data-designable="hero"
        onClick={selectHero}
      >
        {designMode ? <DesignableBadge id="hero" selected={selected} placement="inside" /> : null}

        <div className="relative col-start-1 row-start-1 h-[var(--mobile-hero-h)] w-full overflow-hidden bg-slate-900 md:absolute md:inset-0 md:h-auto">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ opacity: clampOpacity(hero?.opacity) }}
          >
            <HeroSlideshow
              key={slideshowModeId}
              imageIds={imageIds}
              intervalSec={intervalSec}
              transition={transition}
              width={HERO_W}
              height={heroH}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-slate-900/20 max-md:from-slate-950/90 max-md:via-slate-900/35 max-md:to-slate-900/15"
              aria-hidden
            />
          </div>

          {designMode ? (
            <div
              className="absolute bottom-0 left-0 right-0 z-50 hidden h-3 cursor-ns-resize items-center justify-center bg-blue-600/80 md:flex"
              title="სიმაღლის შეცვლა"
              onPointerDown={(e) => onHeightPointerDown(e, 'desktop')}
              onPointerMove={onHeightPointerMove}
              onPointerUp={onHeightPointerUp}
              onPointerCancel={onHeightPointerUp}
            >
              <span className="h-1 w-10 rounded-full bg-white/90" />
            </div>
          ) : null}

          {designMode ? (
            <div
              className={`absolute bottom-0 left-0 right-0 z-40 flex touch-none cursor-ns-resize items-center justify-center md:hidden ${
                selected ? 'h-11 bg-blue-600/95' : 'h-8 bg-blue-600/75'
              }`}
              title="ფოტოს სიმაღლე — გადაათრიე"
              onPointerDown={(e) => onHeightPointerDown(e, 'mobile')}
              onPointerMove={onHeightPointerMove}
              onPointerUp={onHeightPointerUp}
              onPointerCancel={onHeightPointerUp}
            >
              <div className="flex flex-col items-center gap-0.5 text-white">
                <span className="h-1 w-14 rounded-full bg-white/95" />
                <span className="text-[10px] font-bold leading-none">
                  ფოტო {mobileHeroH}px
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="contents md:absolute md:inset-0 md:z-40 md:mx-auto md:flex md:h-full md:w-full md:max-w-[var(--hero-content-w)] md:flex-col md:justify-end md:gap-3 md:overflow-visible md:px-4 md:pb-5 md:pt-8">
          <div className="relative z-30 col-start-1 row-start-1 min-h-0 w-full px-3 pt-2 md:min-h-[4rem] md:px-0 md:pt-0">
            {titleBlock}
          </div>
          <div
            className="relative z-40 col-start-1 row-start-2 flex w-full flex-col px-3 pb-0 pt-2 md:px-0 md:pt-0 max-md:[gap:var(--stack-gap)]"
            style={{ '--stack-gap': `${mobileStackGap}px` } as React.CSSProperties}
          >
            {dealAndSearch}
          </div>
        </div>
      </div>
    </section>
  );
}
