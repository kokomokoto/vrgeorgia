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
  type ResolvedHeroMedia,
} from '@/lib/heroImageStorage';
import type { DesignMediaKind } from '@/lib/designMedia';

const HERO_W = 1920;

type Layer = {
  key: string;
  src: string;
  kind: DesignMediaKind;
  embedUrl?: string;
  opacity: number;
  blur: number;
  z: number;
};

function HeroMediaLayer({
  layer,
  width,
  height,
  style,
}: {
  layer: Layer;
  width: number;
  height: number;
  style: React.CSSProperties;
}) {
  const isStaticDefault =
    layer.src === DEFAULT_HERO_IMAGE && !layer.src.startsWith('blob:');

  if (isStaticDefault) {
    return (
      <Image
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

  if (layer.kind === 'video' && layer.embedUrl?.includes('youtube.com/embed')) {
    return (
      <iframe
        src={layer.embedUrl}
        title=""
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 border-0 object-cover"
        style={style}
        allow="autoplay; encrypted-media"
        tabIndex={-1}
      />
    );
  }

  if (layer.kind === 'video') {
    return (
      <video
        src={layer.embedUrl || layer.src}
        className="absolute inset-0 h-full w-full object-cover object-center"
        style={style}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={layer.src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-center"
      style={style}
      draggable={false}
    />
  );
}

/**
 * Crossfading hero background. Uses uploaded gallery ids (IndexedDB),
 * external media URLs, or default JPG.
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
  const [urls, setUrls] = React.useState<ResolvedHeroMedia[]>([]);
  /** SSR + first paint: always show default photo (avoids dark empty flash) */
  const [layers, setLayers] = React.useState<Layer[]>([
    {
      key: 'default',
      src: DEFAULT_HERO_IMAGE,
      kind: 'image',
      opacity: 1,
      blur: 0,
      z: 1,
    },
  ]);
  const transitioning = React.useRef(false);
  const indexRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: ResolvedHeroMedia[] = [];

    (async () => {
      if (imageIds.length === 0) {
        if (!cancelled) {
          setUrls([]);
          indexRef.current = 0;
          setLayers([
            {
              key: 'default',
              src: DEFAULT_HERO_IMAGE,
              kind: 'image',
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
            kind: loaded[0].kind,
            embedUrl: loaded[0].embedUrl,
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
            kind: 'image',
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
    if (urls.length > 0) {
      return urls.map((u) => ({
        key: u.id,
        src: u.url,
        kind: u.kind,
        embedUrl: u.embedUrl,
      }));
    }
    return [{ key: 'default', src: DEFAULT_HERO_IMAGE, kind: 'image' as const, embedUrl: undefined }];
  }, [urls]);

  const goNext = React.useCallback(() => {
    if (sources.length < 2 || transitioning.current) return;
    const next = (indexRef.current + 1) % sources.length;
    const duration = heroTransitionDurationMs(transition);
    const incoming = sources[next];
    const outgoing = sources[indexRef.current];
    const outgoingKey = outgoing?.key;

    if (transition === 'cut' || duration === 0) {
      indexRef.current = next;
      setLayers([
        {
          key: incoming.key,
          src: incoming.src,
          kind: incoming.kind,
          embedUrl: incoming.embedUrl,
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
        src: outgoing.src,
        kind: outgoing.kind,
        embedUrl: outgoing.embedUrl,
        opacity: 1,
        blur: 0,
        z: 1,
      },
      {
        key: `${incoming.key}-in`,
        src: incoming.src,
        kind: incoming.kind,
        embedUrl: incoming.embedUrl,
        opacity: 0,
        blur: useBlur ? 12 : 0,
        z: 2,
      },
    ]);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLayers([
          {
            key: `${outgoingKey}-out`,
            src: outgoing.src,
            kind: outgoing.kind,
            embedUrl: outgoing.embedUrl,
            opacity: 0,
            blur: useBlur ? 10 : 0,
            z: 1,
          },
          {
            key: `${incoming.key}-in`,
            src: incoming.src,
            kind: incoming.kind,
            embedUrl: incoming.embedUrl,
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
          kind: incoming.kind,
          embedUrl: incoming.embedUrl,
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
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {layers.map((layer) => {
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

        return (
          <HeroMediaLayer
            key={layer.key}
            layer={layer}
            width={width}
            height={height}
            style={style}
          />
        );
      })}
    </div>
  );
}

export { HERO_W };
