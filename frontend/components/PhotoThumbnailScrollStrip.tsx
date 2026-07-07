'use client';

import React from 'react';

const SCROLL_SPEED = 8;
const EDGE_WIDTH_CLASS = 'w-12 sm:w-14';
const DRAG_THRESHOLD_PX = 4;

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function PhotoThumbnailScrollStrip({ children, className = '' }: Props) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const dirRef = React.useRef<-1 | 0 | 1>(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    scrollLeft: number;
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, children]);

  const stopScroll = React.useCallback(() => {
    dirRef.current = 0;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startScroll = React.useCallback(
    (dir: -1 | 1) => {
      dirRef.current = dir;
      if (rafRef.current != null) return;
      const tick = () => {
        const el = scrollRef.current;
        if (!el || dirRef.current === 0) {
          rafRef.current = null;
          return;
        }
        const before = el.scrollLeft;
        el.scrollLeft += dirRef.current * SCROLL_SPEED;
        updateScrollState();
        if (el.scrollLeft === before) {
          stopScroll();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopScroll, updateScrollState]
  );

  React.useEffect(() => () => stopScroll(), [stopScroll]);

  const endDrag = React.useCallback(() => {
    if (!dragRef.current?.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
  }, []);

  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;

    dragRef.current = {
      active: true,
      moved: false,
      startX: e.pageX,
      scrollLeft: el.scrollLeft,
    };
    setIsDragging(true);
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const el = scrollRef.current;
      if (!drag?.active || !el) return;

      const dx = e.pageX - drag.startX;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }
      el.scrollLeft = drag.scrollLeft - dx;
      updateScrollState();
    };

    const onMouseUp = () => endDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [endDrag, updateScrollState]);

  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (dragRef.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current) dragRef.current.moved = false;
    }
  }, []);

  const edgeBase =
    `absolute top-0 bottom-0 z-10 flex ${EDGE_WIDTH_CLASS} cursor-pointer items-center justify-center`;

  return (
    <div className="relative">
      {canScrollLeft && (
        <div
          className={`${edgeBase} left-0 bg-gradient-to-r from-white via-white/80 to-transparent`}
          onMouseEnter={() => startScroll(-1)}
          onMouseLeave={stopScroll}
          aria-hidden
        >
          <span className="select-none text-2xl leading-none text-slate-400">‹</span>
        </div>
      )}
      {canScrollRight && (
        <div
          className={`${edgeBase} right-0 bg-gradient-to-l from-white via-white/80 to-transparent`}
          onMouseEnter={() => startScroll(1)}
          onMouseLeave={stopScroll}
          aria-hidden
        >
          <span className="select-none text-2xl leading-none text-slate-400">›</span>
        </div>
      )}
      <div
        ref={scrollRef}
        className={`${className} ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onScroll={updateScrollState}
        onMouseDown={onMouseDown}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
