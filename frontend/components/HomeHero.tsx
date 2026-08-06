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
  resolveActiveThemeMode,
} from '@/lib/themeModes';

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
  const searchH = search?.h ?? 88;
  const dealW = deal?.w ?? 480;
  const dealH = deal?.h ?? 48;
  const heroH = hero?.h ?? 360;
  const heroTextTitle = heroText?.title?.trim() ? heroText.title : title;
  const heroTextSubtitle = heroText?.subtitle?.trim() ? heroText.subtitle : subtitle;

  const imageIds = React.useMemo(() => {
    const modes =
      design?.layout.themeModes?.length
        ? design.layout.themeModes
        : createDefaultThemeModes();
    const enabled = getEnabledThemeModes(modes);
    const active = resolveActiveThemeMode(enabled, activeModeId, theme);

    const pick = (modeId: string) => {
      const mode = modes.find((m) => m.id === modeId);
      if (!mode) return [] as string[];
      const selectedRot = mode.imageIds.filter((id) => mode.rotationIds.includes(id));
      if (selectedRot.length > 0) return selectedRot;
      return mode.imageIds.length > 0 ? [mode.imageIds[0]] : [];
    };

    const primary = pick(active.id);
    if (primary.length > 0) return primary;

    for (const mode of enabled) {
      if (mode.id === active.id) continue;
      const ids = pick(mode.id);
      if (ids.length > 0) return ids;
    }
    return [];
  }, [design?.layout.themeModes, activeModeId, theme]);

  const intervalSec = hero?.intervalSec ?? 6;
  const transition = hero?.transition ?? 'fade-slow';

  const dragRef = React.useRef<{
    startY: number;
    origH: number;
    historyStarted: boolean;
  } | null>(null);

  const onHeightPointerDown = (e: React.PointerEvent) => {
    if (!design || !designMode) return;
    e.preventDefault();
    e.stopPropagation();
    design.setSelectedId('hero');
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = {
      startY: e.clientY,
      origH: heroH,
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
    // Map viewport dy to design-space height at 1920 ref
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : HERO_W;
    const scale = HERO_W / Math.max(1, viewportW);
    const nextH = Math.max(160, Math.min(900, Math.round(d.origH + dy * scale)));
    design.updateHero({ h: nextH });
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

  return (
    <section className="relative left-1/2 z-30 w-screen max-w-[100vw] -translate-x-1/2">
      <div
        className="relative isolate w-full bg-slate-900"
        style={{
          aspectRatio: `${HERO_W} / ${heroH}`,
          outline: designMode
            ? selected
              ? '2px solid #2563eb'
              : '1px dashed #94a3b8'
            : undefined,
          outlineOffset: designMode ? 2 : undefined,
        }}
        data-designable="hero"
        onClick={
          designMode
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                design?.setSelectedId('hero');
              }
            : undefined
        }
      >
        {designMode ? <DesignableBadge id="hero" selected={selected} placement="inside" /> : null}

        {/* მედია — მხოლოდ აქ იჭრება overflow; სერჩის დროპდაუნები არ იჭრება */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <HeroSlideshow
            imageIds={imageIds}
            intervalSec={intervalSec}
            transition={transition}
            width={HERO_W}
            height={heroH}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-slate-900/20"
            aria-hidden
          />
        </div>

        <div className="relative z-40 mx-auto flex h-full w-full max-w-[1280px] flex-col justify-end gap-3 px-4 pb-4 pt-8 sm:px-0 sm:pb-5">
          <Designable id="heroText" className="max-w-full px-4 sm:px-0">
            <div className="flex h-full max-w-full flex-col justify-start">
              <h1
                className="font-serif font-semibold tracking-tight"
                style={{
                  fontSize: heroText?.titleFontSize ?? 32,
                  color: heroText?.titleColor ?? '#ffffff',
                  lineHeight: 1.2,
                }}
              >
                {heroTextTitle}
              </h1>
              <p
                className="mt-1.5 leading-relaxed"
                style={{
                  fontSize: heroText?.subtitleFontSize ?? 14,
                  color: heroText?.subtitleColor ?? '#e5e5e5',
                }}
              >
                {heroTextSubtitle}
              </p>
            </div>
          </Designable>

          {dealBar ? (
            <Designable id="dealBar" className="max-w-full">
              <div
                className="box-border flex h-full w-full items-center"
                style={{ width: '100%', height: dealH, maxWidth: dealW }}
              >
                {dealBar}
              </div>
            </Designable>
          ) : null}

          <Designable id="search" className="relative z-50 mx-auto w-full max-w-full overflow-visible">
            <div
              className={`relative box-border flex h-full w-full items-stretch overflow-visible border shadow-lg ${
                search?.borderColor ? '' : 'border-white/30 dark:border-zinc-600'
              }`}
              style={{
                width: '100%',
                height: searchH,
                maxWidth: searchW,
                borderRadius: search?.borderRadius ?? 12,
                paddingLeft: search?.padX ?? 10,
                paddingRight: search?.padX ?? 10,
                paddingTop: search?.padY ?? 8,
                paddingBottom: search?.padY ?? 8,
                ...(search?.borderColor ? { borderColor: search.borderColor } : null),
              }}
            >
              {/* blur ცალკე ფენაზე — backdrop-filter ჭრის ტექსტს შვილებზე */}
              <div
                className={`pointer-events-none absolute inset-0 -z-0 rounded-[inherit] backdrop-blur-sm ${
                  search?.background ? '' : 'bg-white/95 dark:bg-zinc-950/90'
                }`}
                style={search?.background ? { backgroundColor: search.background } : undefined}
                aria-hidden
              />
              <div className="relative z-10 flex h-full min-h-0 w-full items-center overflow-visible">
                {children}
              </div>
            </div>
          </Designable>
        </div>

        {designMode ? (
          <div
            className="absolute bottom-0 left-0 right-0 z-30 flex h-3 cursor-ns-resize items-center justify-center bg-blue-600/80"
            title="სიმაღლის შეცვლა"
            onPointerDown={onHeightPointerDown}
            onPointerMove={onHeightPointerMove}
            onPointerUp={onHeightPointerUp}
            onPointerCancel={onHeightPointerUp}
          >
            <span className="h-1 w-10 rounded-full bg-white/90" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
