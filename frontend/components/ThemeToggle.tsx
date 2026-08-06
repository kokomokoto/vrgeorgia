'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { useHomeDesignOptional } from '@/components/home-design/HomeDesignContext';
import {
  resolveToggleIconEmoji,
  THEME_BASE_TONE_ICONS,
} from '@/lib/themeModes';
import { resolveHeroImageUrls, revokeHeroUrls } from '@/lib/heroImageStorage';
import {
  externalMediaDisplayUrl,
  type DesignMediaKind,
} from '@/lib/designMedia';

type ToggleMedia = {
  url?: string;
  kind?: DesignMediaKind;
  embedUrl?: string;
};

function useToggleIconMedia(
  imageId?: string,
  mediaUrl?: string,
  mediaKind?: DesignMediaKind
): ToggleMedia | null {
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

function ToggleIconVisual({
  media,
  emojiFallback,
}: {
  media: ToggleMedia | null;
  emojiFallback: string;
}) {
  if (media?.kind === 'video' && media.embedUrl?.includes('youtube.com/embed')) {
    const src = media.embedUrl.includes('autoplay')
      ? media.embedUrl
      : `${media.embedUrl}${media.embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0`;
    return (
      <iframe
        src={src}
        title=""
        className="pointer-events-none h-7 w-7 scale-125 rounded border-0"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
      />
    );
  }

  if (media?.kind === 'video' && (media.embedUrl || media.url)) {
    return (
      <video
        src={media.embedUrl || media.url}
        className="pointer-events-none h-7 w-7 rounded object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      />
    );
  }

  if (media?.url) {
    return (
      <span
        aria-hidden
        className="block h-7 w-7 rounded bg-cover bg-center"
        style={{ backgroundImage: `url(${media.url})` }}
      />
    );
  }

  return <span aria-hidden="true">{emojiFallback}</span>;
}

export function ThemeToggle() {
  const { toggle, modeInfos, activeModeId } = useTheme();
  const design = useHomeDesignOptional();
  const designMode = design?.designMode ?? false;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const currentIndex = modeInfos.findIndex((m) => m.id === activeModeId);
  const next =
    modeInfos.length > 0
      ? modeInfos[(currentIndex < 0 ? 0 : currentIndex + 1) % modeInfos.length]
      : null;
  // In Design Mode show the active mode’s icon (what you edit on click).
  // Outside Design Mode show the next mode’s icon (what a click will switch to).
  const displayInfo = designMode
    ? modeInfos.find((m) => m.id === activeModeId) || modeInfos[0] || null
    : next;

  const displayModeDef = React.useMemo(() => {
    if (!displayInfo) return null;
    return design?.layout.themeModes?.find((m) => m.id === displayInfo.id) || null;
  }, [design?.layout.themeModes, displayInfo]);

  const media = useToggleIconMedia(
    displayModeDef?.toggleIconImageId,
    displayModeDef?.toggleIconMediaUrl,
    displayModeDef?.toggleIconMediaKind
  );

  const label = !mounted
    ? 'შემდეგი რეჟიმი'
    : designMode && displayInfo
      ? `რეჟიმის იკონი: ${displayInfo.label}`
      : next
        ? `შემდეგი: ${next.label}`
        : 'რეჟიმი';

  const emojiFallback = !mounted
    ? '🌅'
    : displayModeDef
      ? resolveToggleIconEmoji(displayModeDef)
      : displayInfo
        ? THEME_BASE_TONE_ICONS[displayInfo.baseTone]
        : '☀️';

  const disabled = !designMode && modeInfos.length < 2;
  const selected = designMode && design?.selectedId === 'theme';

  return (
    <button
      type="button"
      onClick={(e) => {
        if (designMode) {
          e.preventDefault();
          e.stopPropagation();
          design?.setSelectedId('theme');
          design?.setSelectedHeaderItemId(null);
          return;
        }
        toggle();
      }}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-designable="theme"
      className={`inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border text-lg transition-colors disabled:cursor-default disabled:opacity-60 ${
        designMode
          ? selected
            ? 'cursor-pointer border-blue-600 ring-2 ring-blue-600 bg-white text-slate-700 dark:bg-zinc-800 dark:text-amber-400'
            : 'cursor-pointer border-blue-400 ring-1 ring-blue-400/60 bg-white text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:text-amber-400'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-amber-400 dark:hover:bg-zinc-700 twilight:border-orange-200/80 twilight:bg-orange-50/90 twilight:text-orange-800 twilight:hover:bg-orange-100/90'
      }`}
    >
      <ToggleIconVisual media={mounted ? media : null} emojiFallback={emojiFallback} />
    </button>
  );
}
