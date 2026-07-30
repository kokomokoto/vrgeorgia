'use client';

import React from 'react';
import { Designable } from '@/components/home-design/Designable';
import { DesignableBadge } from '@/components/home-design/DesignableBadge';
import { HeroSlideshow, HERO_W } from '@/components/home-design/HeroSlideshow';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import { useTheme } from '@/components/ThemeProvider';

const DRAG_THRESHOLD_PX = 3;

export function HomeHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const design = useHomeDesignOptional();
  const { theme } = useTheme();
  const designMode = design?.designMode ?? false;
  const selected = design?.selectedId === 'hero';
  const search = design?.layout.search;
  const hero = design?.layout.hero;
  const heroText = design?.layout.heroText;
  const searchW = search?.w ?? 1280;
  const searchH = search?.h ?? 70;
  const heroH = hero?.h ?? 360;
  const heroTextTitle = heroText?.title?.trim() ? heroText.title : title;
  const heroTextSubtitle = heroText?.subtitle?.trim() ? heroText.subtitle : subtitle;

  const imageIds = React.useMemo(() => {
    const enabledModes = hero?.enabledModes?.length
      ? hero.enabledModes
      : (['day', 'twilight', 'night'] as const);
    const dayIds = hero?.dayImageIds || [];
    const twilightIds = hero?.twilightImageIds || [];
    const nightIds = hero?.nightImageIds || [];
    const dayRotation = hero?.dayRotationIds || [];
    const twilightRotation = hero?.twilightRotationIds || [];
    const nightRotation = hero?.nightRotationIds || [];

    let baseIds: string[];
    let rotationIds: string[];

    const modeOrder =
      theme === 'dark'
        ? (['night', 'twilight', 'day'] as const)
        : theme === 'twilight'
          ? (['twilight', 'day', 'night'] as const)
          : (['day', 'twilight', 'night'] as const);

    const preferredMode =
      modeOrder.find((mode) => enabledModes.includes(mode)) ?? enabledModes[0] ?? 'day';

    if (preferredMode === 'night') {
      baseIds = nightIds.length ? nightIds : twilightIds.length ? twilightIds : dayIds;
      rotationIds = nightIds.length
        ? nightRotation
        : twilightIds.length
          ? twilightRotation
          : dayRotation;
    } else if (preferredMode === 'twilight') {
      baseIds = twilightIds.length ? twilightIds : dayIds.length ? dayIds : nightIds;
      rotationIds = twilightIds.length
        ? twilightRotation
        : dayIds.length
          ? dayRotation
          : nightRotation;
    } else {
      baseIds = dayIds.length ? dayIds : twilightIds.length ? twilightIds : nightIds;
      rotationIds = dayIds.length
        ? dayRotation
        : twilightIds.length
          ? twilightRotation
          : nightRotation;
    }

    const selected = baseIds.filter((id) => rotationIds.includes(id));
    if (selected.length > 0) return selected;
    return baseIds.length > 0 ? [baseIds[0]] : [];
  }, [hero, theme]);

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
    <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
      <div
        className="relative isolate w-full overflow-hidden bg-slate-900"
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
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] flex-col justify-end gap-3 px-4 pb-4 pt-8 sm:px-0 sm:pb-5">
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
          <Designable id="search" className="mx-auto w-full max-w-full">
            <div
              className="box-border flex h-full w-full items-center rounded-xl border border-white/30 bg-white/95 px-2.5 shadow-lg backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-950/90"
              style={{
                width: '100%',
                height: searchH,
                maxWidth: searchW,
              }}
            >
              {children}
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
