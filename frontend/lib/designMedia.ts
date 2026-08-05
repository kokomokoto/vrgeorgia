/** Homepage Design Mode media helpers — local blobs + external URLs */

import { extractYouTubeVideoId, toYouTubeEmbedUrl } from '@/lib/youtubeEmbed';
import { compressPhotoForUpload } from '@/lib/clientPhotoCompress';

export type DesignMediaKind = 'image' | 'gif' | 'video';

const EXT_PREFIX = 'ext:v1:';

export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}

export function detectMediaKindFromFile(file: File): DesignMediaKind {
  if (isGifFile(file)) return 'gif';
  if (file.type.startsWith('video/')) return 'video';
  return 'image';
}

export function detectMediaKindFromUrl(url: string): DesignMediaKind {
  const trimmed = url.trim();
  if (extractYouTubeVideoId(trimmed)) return 'video';
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(trimmed)) return 'video';
  if (/\.gif(\?|#|$)/i.test(trimmed)) return 'gif';
  return 'image';
}

/** Photos compress to JPEG; GIF/video stay untouched so animation/playback survive. */
export async function prepareDesignMediaFile(file: File): Promise<File> {
  if (isGifFile(file) || file.type.startsWith('video/')) return file;
  return compressPhotoForUpload(file, false);
}

export function normalizeMediaUrlInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let url = t;
  if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
    url = `https://${url}`;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

export function makeExternalMediaId(kind: DesignMediaKind, url: string): string {
  return `${EXT_PREFIX}${kind}:${encodeURIComponent(url.trim())}`;
}

export function parseExternalMediaId(
  id: string
): { kind: DesignMediaKind; url: string } | null {
  if (!id.startsWith(EXT_PREFIX)) return null;
  const rest = id.slice(EXT_PREFIX.length);
  const m = rest.match(/^(image|gif|video):([\s\S]+)$/);
  if (!m) return null;
  try {
    return { kind: m[1] as DesignMediaKind, url: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

export function isExternalMediaId(id: string): boolean {
  return parseExternalMediaId(id) !== null;
}

export function isBlobMediaId(id: string): boolean {
  return !isExternalMediaId(id);
}

/** Preview/poster URL for external media (YouTube → thumbnail). */
export function externalMediaDisplayUrl(
  kind: DesignMediaKind,
  url: string
): { url: string; embedUrl?: string } {
  if (kind === 'video') {
    const ytId = extractYouTubeVideoId(url);
    const embed = toYouTubeEmbedUrl(url);
    if (ytId) {
      return {
        url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        embedUrl: embed
          ? `${embed}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&playsinline=1`
          : undefined,
      };
    }
    return { url, embedUrl: url };
  }
  return { url };
}

export function mediaKindLabel(kind: DesignMediaKind): string {
  if (kind === 'gif') return 'GIF';
  if (kind === 'video') return 'ვიდეო';
  return 'ფოტო';
}
