'use client';

import React from 'react';
import Image from 'next/image';
import {
  heroTransitionDurationMs,
  type HeroTransition,
} from '@/lib/homeDesignLayout';
import {
  DEFAULT_HERO_IMAGE,
  resolveHeroImageUrls,
  revokeHeroUrls,
} from '@/lib/heroImageStorage';

const HERO_W = 1920;

type Layer = {
  key: string;
  src: string;
  opacity: number;
  blur: number;
  z: number;
};

/**
 * Crossfading hero background. Uses uploaded gallery ids (IndexedDB) or default JPG.
 */
export function HeroSlideshow({
  imageIds,
  intervalSec,
  transition,
  width,
  height,
}: {
  imageIds: string[];
  intervalSec: number;
  transition: HeroTransition;
  width: number;
  height: number;
}) {
  const [urls, setUrls] = React.useState<{ id: string; url: string }[]>([]);
  const [layers, setLayers] = React.useState<Layer[]>([]);
  const transitioning = React.useRef(false);
  const indexRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: { id: string; url: string }[] = [];

    (async () => {
      if (imageIds.length === 0) {
        if (!cancelled) {
          setUrls([]);
          indexRef.current = 0;
          setLayers([
            {
              key: 'default',
              src: DEFAULT_HERO_IMAGE,
              opacity: 1,
              blur: 0,
              z: 1,
            },
          ]);
        }
        return;
      }
      loaded = await resolveHeroImageUrls(imageIds);
      if (cancelled) {
        revokeHeroUrls(loaded);
        return;
      }
      setUrls(loaded);
      indexRef.current = 0;
      if (loaded[0]) {
        setLayers([
          {
            key: loaded[0].id,
            src: loaded[0].url,
            opacity: 1,
            blur: 0,
            z: 1,
          },
        ]);
      } else {
        setLayers([
          {
            key: 'default',
            src: DEFAULT_HERO_IMAGE,
            opacity: 1,
            blur: 0,
            z: 1,
          },
        ]);
      }
    })();

    return () => {
      cancelled = true;
      revokeHeroUrls(loaded);
    };
  }, [imageIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const sources = React.useMemo(() => {
    if (urls.length > 0) return urls.map((u) => ({ key: u.id, src: u.url }));
    return [{ key: 'default', src: DEFAULT_HERO_IMAGE }];
  }, [urls]);

  const goNext = React.useCallback(() => {
    if (sources.length < 2 || transitioning.current) return;
    const next = (indexRef.current + 1) % sources.length;
    const duration = heroTransitionDurationMs(transition);
    const incoming = sources[next];
    const outgoingKey = sources[indexRef.current]?.key;

    if (transition === 'cut' || duration === 0) {
      indexRef.current = next;
      setLayers([
        {
          key: incoming.key,
          src: incoming.src,
          opacity: 1,
          blur: 0,
          z: 1,
        },
      ]);
      return;
    }

    transitioning.current = true;
    const useBlur = transition === 'blur';

    setLayers([
      {
        key: `${outgoingKey}-out`,
        src: sources[indexRef.current].src,
        opacity: 1,
        blur: 0,
        z: 1,
      },
      {
        key: `${incoming.key}-in`,
        src: incoming.src,
        opacity: 0,
        blur: useBlur ? 12 : 0,
        z: 2,
      },
    ]);

    // next frame: animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLayers([
          {
            key: `${outgoingKey}-out`,
            src: sources[indexRef.current].src,
            opacity: 0,
            blur: useBlur ? 10 : 0,
            z: 1,
          },
          {
            key: `${incoming.key}-in`,
            src: incoming.src,
            opacity: 1,
            blur: 0,
            z: 2,
          },
        ]);
      });
    });

    window.setTimeout(() => {
      indexRef.current = next;
      setLayers([
        {
          key: incoming.key,
          src: incoming.src,
          opacity: 1,
          blur: 0,
          z: 1,
        },
      ]);
      transitioning.current = false;
    }, duration + 40);
  }, [sources, transition]);

  React.useEffect(() => {
    if (sources.length < 2) return;
    const ms = Math.max(2000, intervalSec * 1000);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      goNext();
    }, ms);
    return () => window.clearInterval(id);
  }, [sources.length, intervalSec, goNext, transition]);

  const duration = heroTransitionDurationMs(transition);

  return (
    <div className="absolute inset-0" aria-hidden>
      {layers.map((layer) => {
        const isStaticDefault = layer.src === DEFAULT_HERO_IMAGE && !layer.src.startsWith('blob:');
        const style: React.CSSProperties = {
          opacity: layer.opacity,
          filter: layer.blur > 0 ? `blur(${layer.blur}px)` : undefined,
          transform: layer.blur > 0 ? 'scale(1.06)' : undefined,
          transition:
            duration > 0
              ? `opacity ${duration}ms ease, filter ${duration}ms ease, transform ${duration}ms ease`
              : undefined,
          zIndex: layer.z,
        };

        if (isStaticDefault) {
          return (
            <Image
              key={layer.key}
              src={DEFAULT_HERO_IMAGE}
              alt=""
              width={width}
              height={height}
              priority
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={style}
            />
          );
        }

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={layer.key}
            src={layer.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={style}
            draggable={false}
          />
        );
      })}
    </div>
  );
}

export { HERO_W };
