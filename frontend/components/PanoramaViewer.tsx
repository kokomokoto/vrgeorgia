'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { getPanoramaViewerUrls } from '@/lib/panorama';

import '@photo-sphere-viewer/core/index.css';

type ViewerInstance = {
  destroy: () => void;
  addEventListener: (name: string, fn: (...args: unknown[]) => void, opts?: { once?: boolean }) => void;
  removeEventListener: (name: string, fn: (...args: unknown[]) => void) => void;
};

type PanoramaViewerProps = {
  src: string;
  className?: string;
  /** false = ჩვენი custom fullscreen ღილაკი lightbox-ში */
  showNavbar?: boolean;
  /** პირველი ინტერაქცია — დაწკაპუნება ან პანორამის დატრიალება */
  onInteract?: () => void;
};

const LOAD_TIMEOUT_MS = 25000;

function waitForPanorama(viewer: ViewerInstance): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Panorama load timeout'));
    }, LOAD_TIMEOUT_MS);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Panorama load error'));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      viewer.removeEventListener('ready', onReady);
      viewer.removeEventListener('panorama-error', onError);
    };

    viewer.addEventListener('ready', onReady, { once: true });
    viewer.addEventListener('panorama-error', onError, { once: true });
  });
}

export function PanoramaViewer({
  src,
  className = 'h-[60vh] w-full min-h-[320px]',
  showNavbar = false,
  onInteract,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerInstance | null>(null);
  const onInteractRef = useRef<(() => void) | undefined>(onInteract);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const urls = useMemo(() => getPanoramaViewerUrls(src), [src]);

  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !src || urls.length === 0) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const { Viewer } = await import('@photo-sphere-viewer/core');
        if (cancelled) return;

        viewerRef.current?.destroy();
        viewerRef.current = null;

        let lastError: unknown = null;

        for (const panorama of urls) {
          if (cancelled) return;

          let viewer: ViewerInstance | null = null;
          try {
            container.replaceChildren();
            const isTouchDevice =
              typeof window !== 'undefined' &&
              ('ontouchstart' in window || navigator.maxTouchPoints > 0);

            viewer = new Viewer({
              container,
              panorama,
              // მხოლოდ სრული ეკრანი — ბრუნვა მაუსით/თითით (zoom/ისრები არ გვჭირდება)
              navbar: showNavbar ? ['fullscreen'] : false,
              defaultZoomLvl: 0,
              mousewheel: !isTouchDevice,
              mousemove: true,
              // ერთი თითით ბრუნვა მობილურზე; true = მხოლოდ 2 თითით (გვერდის scroll-ისთვის)
              touchmoveTwoFingers: false,
              moveInertia: true,
            }) as unknown as ViewerInstance;

            await waitForPanorama(viewer);
            if (cancelled) {
              viewer.destroy();
              return;
            }

            try {
              (viewer as any).zoom?.(0);
            } catch {
              /* ignore */
            }

            if (onInteractRef.current) {
              let notified = false;
              const notifyInteract = () => {
                if (notified) return;
                notified = true;
                onInteractRef.current?.();
              };
              const once = { once: true } as AddEventListenerOptions;
              viewer.addEventListener('click', notifyInteract, once);
              viewer.addEventListener('before-rotate', notifyInteract, once);
              viewer.addEventListener('position-updated', notifyInteract, once);
              container.addEventListener('pointerdown', notifyInteract, { ...once, passive: true });
              container.addEventListener('touchstart', notifyInteract, { ...once, passive: true });
            }

            viewerRef.current = viewer;
            setLoading(false);
            return;
          } catch (e) {
            lastError = e;
            try {
              viewer?.destroy();
            } catch {
              /* ignore */
            }
            container.replaceChildren();
          }
        }

        console.error('PanoramaViewer: all URLs failed', lastError);
        if (!cancelled) {
          setLoading(false);
          setLoadError(true);
        }
      } catch (e) {
        console.error('PanoramaViewer:', e);
        if (!cancelled) {
          setLoading(false);
          setLoadError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      viewerRef.current = null;
    };
  }, [src, urls, showNavbar]);

  if (loadError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-black text-white ${className}`}>
        <p className="text-sm text-white/80">360° პანორამის ჩატვირთვა ვერ მოხერხდა</p>
        <a
          href={urls[0] || src}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"
        >
          გახსენი ფოტო ახალ ჩანართში
        </a>
        <img src={urls[0] || src} alt="" className="max-h-[50vh] max-w-full object-contain opacity-80" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-sm text-white/70">
          360° იტვირთება…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full min-h-[inherit] touch-none" />
    </div>
  );
}
