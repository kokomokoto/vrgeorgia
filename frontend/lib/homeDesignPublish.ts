import type { HomeDesignLayout, RailItem, TypePanelItem } from '@/lib/homeDesignLayout';
import { isBlobMediaId, makeExternalMediaId, type DesignMediaKind } from '@/lib/designMedia';
import { getHeroImageBlob } from '@/lib/heroImageStorage';
import { allThemeModeImageIds, type ThemeModeDef } from '@/lib/themeModes';
import { collectItemImageIds } from '@/lib/homeDesignLayout';
import { uploadHomeDesignMediaFile } from '@/lib/api';

function mapId(id: string | undefined | null, map: Map<string, string>): string | undefined {
  if (!id) return undefined;
  return map.get(id) ?? id;
}

function rewriteItemMedia<T extends { imageId?: string | null; byMode?: Record<string, { imageId?: string | null }> }>(
  item: T,
  map: Map<string, string>
): T {
  const next = { ...item };
  if (typeof next.imageId === 'string' && map.has(next.imageId)) {
    next.imageId = map.get(next.imageId);
  }
  if (next.byMode) {
    const byMode: typeof next.byMode = {};
    for (const [modeId, ov] of Object.entries(next.byMode)) {
      if (!ov) {
        byMode[modeId] = ov;
        continue;
      }
      const patched = { ...ov };
      if (typeof patched.imageId === 'string' && map.has(patched.imageId)) {
        patched.imageId = map.get(patched.imageId);
      }
      byMode[modeId] = patched;
    }
    next.byMode = byMode;
  }
  return next;
}

function rewriteThemeMode(mode: ThemeModeDef, map: Map<string, string>): ThemeModeDef {
  return {
    ...mode,
    imageIds: mode.imageIds.map((id) => mapId(id, map) || id),
    rotationIds: (mode.rotationIds || []).map((id) => mapId(id, map) || id),
    headerBgImageId: mapId(mode.headerBgImageId, map),
    toggleIconImageId: mapId(mode.toggleIconImageId, map),
  };
}

/** Rewrite IndexedDB blob media ids → durable external media ids in a layout clone */
export function rewriteHomeDesignMediaIds(
  layout: HomeDesignLayout,
  map: Map<string, string>
): HomeDesignLayout {
  if (map.size === 0) return layout;
  return {
    ...layout,
    themeModes: (layout.themeModes || []).map((m) => rewriteThemeMode(m, map)),
    serviceRail: {
      ...layout.serviceRail,
      items: layout.serviceRail.items.map((it) =>
        rewriteItemMedia(it as RailItem, map)
      ),
    },
    quickRail: {
      ...layout.quickRail,
      items: layout.quickRail.items.map((it) =>
        rewriteItemMedia(it as RailItem, map)
      ),
    },
    typePanel: {
      ...layout.typePanel,
      items: (layout.typePanel.items || []).map((it) =>
        rewriteItemMedia(it as TypePanelItem, map)
      ),
    },
  };
}

export function collectBlobMediaIds(layout: HomeDesignLayout): string[] {
  const ids = [
    ...allThemeModeImageIds(layout.themeModes || []),
    ...collectItemImageIds(layout.serviceRail.items),
    ...collectItemImageIds(layout.quickRail.items),
    ...collectItemImageIds(layout.typePanel.items || []),
  ].filter(isBlobMediaId);
  return [...new Set(ids)];
}

function kindFromBlob(blob: Blob): DesignMediaKind {
  if (blob.type === 'image/gif') return 'gif';
  if (blob.type.startsWith('video/')) return 'video';
  return 'image';
}

/**
 * Upload every IndexedDB blob referenced by the layout to Cloudinary and
 * return a layout whose media ids are durable https URLs (ext:v1:…).
 */
export async function uploadLocalBlobsInLayout(
  layout: HomeDesignLayout,
  onProgress?: (done: number, total: number) => void
): Promise<HomeDesignLayout> {
  const blobIds = collectBlobMediaIds(layout);
  if (blobIds.length === 0) return layout;

  const map = new Map<string, string>();
  let done = 0;
  for (const id of blobIds) {
    const blob = await getHeroImageBlob(id);
    if (!blob) {
      done += 1;
      onProgress?.(done, blobIds.length);
      continue;
    }
    const kind = kindFromBlob(blob);
    const ext =
      kind === 'gif' ? 'gif' : kind === 'video' ? 'mp4' : 'jpg';
    const file = new File([blob], `${id}.${ext}`, {
      type: blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    });
    const uploaded = await uploadHomeDesignMediaFile(file);
    const mediaKind = (uploaded.kind as DesignMediaKind) || kind;
    map.set(id, makeExternalMediaId(mediaKind, uploaded.url));
    done += 1;
    onProgress?.(done, blobIds.length);
  }

  return rewriteHomeDesignMediaIds(layout, map);
}
